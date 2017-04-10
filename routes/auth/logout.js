const express = require('express');
const router = express.Router();

router.all('/', (req,res)=>{
	req.app.emit('rest_logout',{userID:req.user._id.toString()});
	req.logOut();
	res.redirect('/');
})

module.exports = router;