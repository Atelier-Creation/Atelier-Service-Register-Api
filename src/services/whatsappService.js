const axios = require('axios');
const Settings = require('../models/Settings');

class WhatsAppService {
    constructor() {
        this.baseURL = 'https://graph.facebook.com/v18.0';
    }

    async getSettings() {
        return await Settings.getSettings();
    }

    /**
     * Send WhatsApp message using Meta WhatsApp Business API
     */
    async sendMessage(to, message, settings = null) {
        try {
            if (!settings) {
                settings = await this.getSettings();
            }

            if (!settings.whatsapp.enabled) {
                console.log('WhatsApp notifications are disabled');
                return { success: false, message: 'WhatsApp disabled' };
            }

            const { accessToken, phoneNumberId } = settings.whatsapp;

            if (!accessToken || !phoneNumberId) {
                console.log(`\n[MOCK WHATSAPP] To: ${to}`);
                console.log(`[MOCK CONTENT] ${message}\n`);
                return { success: true, message: 'Mock sent', messageId: 'mock_' + Date.now() };
            }

            // Format phone number (remove + and ensure country code)
            const formattedPhone = to.replace(/\D/g, '');

            const response = await axios.post(
                `${this.baseURL}/${phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: formattedPhone,
                    type: 'text',
                    text: {
                        body: message
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                messageId: response.data.messages[0].id,
                data: response.data
            };
        } catch (error) {
            console.error('WhatsApp send error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message
            };
        }
    }

    /**
     * Send OTP via WhatsApp
     */
    async sendOTP(phone, otp) {
        const settings = await this.getSettings();

        if (!settings.whatsapp.otpVerification) {
            return { success: false, message: 'OTP verification disabled' };
        }

        const message = `Your OTP for order verification is: ${otp}\n\nValid for 5 minutes.\n\n- ${settings.businessName || 'Digital Service Register'}`;

        return await this.sendMessage(phone, message, settings);
    }

    /**
     * Send status update notification
     */
    async sendStatusNotification(job) {
        const settings = await this.getSettings();

        if (!settings.whatsapp.statusNotifications) {
            return { success: false, message: 'Status notifications disabled' };
        }

        // Only send for specific statuses (not outsourced)
        const allowedStatuses = ['received', 'in-progress', 'ready', 'returned'];
        if (!allowedStatuses.includes(job.status)) {
            return { success: false, message: 'Status not eligible for notification' };
        }

        const statusEmojis = {
            'received': '📱',
            'in-progress': '🔧',
            'ready': '✅',
            'returned': '↩️'
        };

        const emoji = statusEmojis[job.status] || '📋';
        const statusText = job.status.replace('-', ' ').toUpperCase();

        const estimatedDelivery = job.estimatedDelivery
            ? `\nExpected Delivery: ${new Date(job.estimatedDelivery).toLocaleDateString()}`
            : '';

        const message = `${emoji} Order Update - #${job.jobId}

Dear ${job.customerName},

Your ${job.device} is now ${statusText}!

Issue: ${job.issue}
Status: ${statusText}${estimatedDelivery}

Thank you for choosing ${settings.businessName || 'us'}!`;

        return await this.sendMessage(job.phone, message, settings);
    }

    /**
     * Send delivery notification with payment breakdown
     */
    async sendDeliveryNotification(job) {
        const settings = await this.getSettings();

        if (!settings.whatsapp.statusNotifications) {
            return { success: false, message: 'Status notifications disabled' };
        }

        let breakdownText = '';

        // Check for structured breakdown data
        if (job.paymentBreakdown && Array.isArray(job.paymentBreakdown) && job.paymentBreakdown.length > 0) {
            breakdownText = '\n💰 Payment Breakdown:\n';
            job.paymentBreakdown.forEach(item => {
                breakdownText += `- ${item.description}: ₹${item.amount.toLocaleString()}\n`;
            });
            const total = job.paymentBreakdown.reduce((sum, item) => sum + item.amount, 0);
            breakdownText += `\nTotal Paid: ₹${total.toLocaleString()}`;
        }
        // Fallback: Parse from note if exists
        else if (job.note && job.note.includes('Breakdown:')) {
            const breakdownMatch = job.note.match(/Breakdown:\s*(.+?)\s*\(Total:/);
            if (breakdownMatch) {
                breakdownText = '\n💰 Payment Breakdown:\n';
                const items = breakdownMatch[1].split(',');
                items.forEach(item => {
                    const trimmed = item.trim();
                    breakdownText += `- ${trimmed}\n`;
                });
            }

            const totalMatch = job.note.match(/\(Total:\s*₹?(\d+)\)/);
            if (totalMatch) {
                breakdownText += `\nTotal Paid: ₹${parseInt(totalMatch[1]).toLocaleString()}`;
            }
        }
        // Simple total if no breakdown
        else {
            breakdownText = `\n💰 Total Amount Paid: ₹${(job.totalAmount || 0).toLocaleString()}`;
        }

        const warranty = job.warranty && job.warranty !== 'No Warranty'
            ? `\n🛡️ Warranty: ${job.warranty}`
            : '';

        const message = `🎉 Order Delivered - #${job.jobId}

Dear ${job.customerName},

Thank you for your business!

Your ${job.device} has been successfully delivered.${breakdownText}${warranty}

We hope to serve you again!

- ${settings.businessName || 'Digital Service Register'}`;

        return await this.sendMessage(job.phone, message, settings);
    }

    /**
     * Send marketing/bulk message
     */
    async sendMarketingMessage(phones, message) {
        const settings = await this.getSettings();

        if (!settings.whatsapp.enabled) {
            return { success: false, message: 'WhatsApp disabled' };
        }

        const results = [];

        for (const phone of phones) {
            try {
                const result = await this.sendMessage(phone, message, settings);
                results.push({
                    phone,
                    ...result
                });

                // Rate limiting: wait 100ms between messages
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                results.push({
                    phone,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            success: true,
            results,
            total: phones.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        };
    }

    /**
     * Verify webhook (for receiving incoming messages - future use)
     */
    verifyWebhook(mode, token, challenge, settings) {
        if (mode && token) {
            if (mode === 'subscribe' && token === settings.whatsapp.webhookVerifyToken) {
                return challenge;
            }
        }
        return null;
    }
}

module.exports = new WhatsAppService();
