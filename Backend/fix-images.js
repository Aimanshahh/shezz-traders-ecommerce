require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const db = mongoose.connection.db;
    const products = db.collection('products');
    const cursor = products.find({});
    let count = 0;

    await cursor.forEach(async (doc) => {
        let updated = false;

        const fixUrl = (url) => {
            if (typeof url === 'string' && url.includes('/uploads/')) {
                updated = true;
                // This splits the URL at '/uploads/' and keeps only the second part
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
            await products.updateOne({ _id: doc._id }, { $set: { images: doc.images, image: doc.image } });
            count++;
        }
    });

    console.log('✅ Database fixed! Sanitized image paths for ' + count + ' products.');
    process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
