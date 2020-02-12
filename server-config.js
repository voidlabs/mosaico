// Put here your email sending configurations!
module.exports = {
	emailTransport: {
		 host: 'localhost',
		 port: 25,
		// auth: { user: '####', pass: '####' }
	},
	emailOptions: {
		from: 'Feedback <test@ec2-54-148-61-5.us-west-2.compute.amazonaws.com>', // sender address
		// bcc: 'mosaico@mosaico.io',
	}
};
