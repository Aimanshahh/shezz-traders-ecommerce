require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const db = mongoose.connection.db;
    const products = db.collection('products');
    
    // Fetch all products into memory
    const allProducts = await products.find({}).toArray();
    let count = 0;

    // Use a standard for...of loop so it waits for each update to finish
    for (const doc of allProducts) {
        let updated = false;

        const fixUrl = (url) => {
            if (typeof url === 'string' && url.includes('/uploads/')) {
                updated = true;
                const parts = url.split('/uploads/');
                return '/uploads/' + parts[parts.length - 1];
            }
            return url;
        };

        if (doc.images && Array.isArray(doc.images)) {
            doc.images = doc.images.map(fixUrl);
        }
        if (doc.image) {
            doc.image = fixUrl(doc.image);
        }

        if (updated) {
            await products.updateOne(
                { _id: doc._id }, 
                { $set: { images: doc.images, image: doc.image } }
            );
            count++;
        }
    }

    console.log('✅ Successfully fixed ' + count + ' products in the database.');
    process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
