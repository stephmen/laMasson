const mongoose = require('mongoose')
const Store =  mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');
   
const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter(req, file, next){
        const isPhoto = file.mimetype.startsWith('image/')
        if(isPhoto) {
        next(null, true);
        } else {
            next({message: 'That filetype isn\'t allowed!'}, false);
        }
    }
};

exports.homePage = (req,res) => {
    console.log(req.name);
    res.render('index'); 
};
exports.addStore = (req,res) => {
    console.log(req.name);
    res.render('editStore', {title: 'Add Store'}); 
}

exports.upload = multer(multerOptions).single('photo')

exports.resize = async (req, res, next) => {
   // check if there is no file to request
   if(!req.file) {
       next(); //skip to the next middleware
       return;  
   } 
   const extension = req.file.mimetype.split('/')[1];
   req.body.photo = `${uuid.v4()}.${extension}`;
   // now resize
   const photo = await jimp.read(req.file.buffer);
   await photo.resize(800, jimp.AUTO)
   await photo.write(`./public/uploads/${req.body.photo}`);
   // once we written the photo to our filesystem, keep going!
   next(); 
};


exports.createStore = async (req,res) => {
    req.body.author = req.user._id;
    const store = await (new Store(req.body)).save();
    req.flash('success', `Succefully Created ${store.name}. Care to leave a review?`);
    res.redirect(`/store/${store.slug}`);
}; 

exports.getStores = async (req,res) => {
    //1. Query the database for a list of all stores
    const stores = await Store.find()
    res.render('stores', { title: 'Stores', stores});
}

const confirmOwner = (store, user) => {
    if(!store.author.equals(user._id)) {
    throw Error('You must own a store in order to edit it !');
    }
};
exports.editStore = async (req,res) => {
    // 1. Find the store given the ID
    const store = await Store.findOne({_id: req.params.id });
    // 2. confirm they are the owner of the store
    confirmOwner(store, req.user);
    // 3. Render out the edit form so teh user can update their store 
    res.render('editStore', {title: `Edit ${store.name}`, store }) 

}

exports.updateStore = async (req, res) => {
    //set the location type as a point
    //req.body.location.type = 'Point';
    //find and update the store
    const store = await Store.findOneAndUpdate({_id: req.params.id}, req .body,
    {
        new: true, //return new store instead of old one
        runvalidators: true
    }).exec();
    req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store → </a>`);
    res.redirect(`/stores/${store._id}/edit`);
    //redirect them the store and tell them if it worked
};

 exports.getStoreBySlug = async (req, res) => {
     const store = await Store.findOne({slug: req.params.slug}).populate('author');
     if(!store) return next();
     //res.json(store);
     res.render('store', { store, title: store.name}) 
 }  

 exports.getStoreByTag = async (req,res) => {
    const tag = req.params.tag;
    const tagQuery = tag || { $exists: true };
    const tagsPromise = Store.getTagsList();
    const storesPromise = Store.find({ tags: tagQuery });
    const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
     
    res.render('tag', { tags, title: 'Tags', tag, stores });
 };

 exports.searchStores = async (req, res) => {
    //res.json(req.query) 
    const stores = await Store
    //First find stores that match
    .find({
         $text: {
         $search: req.query.q 
         }
        },{
             score: { $meta: 'textScore' }
         })
         //than sort them
         .sort({
             score: { $meta: 'textScore'}
         })
         //limit 5 
         .limit(5);
    res.json(stores);
 };
 //