const Vendor = require('../models/Vendor');

exports.getVendors = async (req, res) => {
    try {
        const vendors = await Vendor.find().sort({ name: 1 });
        res.json(vendors);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.createVendor = async (req, res) => {
    try {
        const { name, phone } = req.body;
        // Check case insensitive
        let vendor = await Vendor.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });

        if (vendor) {
            // If phone provided and different, update it? 
            // For now, let's just update phone if provided, as the user might be correcting it.
            if (phone) {
                vendor.phone = phone;
                await vendor.save();
            }
            return res.json(vendor);
        }

        vendor = new Vendor({ name, phone });
        await vendor.save();
        res.status(201).json(vendor);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
