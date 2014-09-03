exports.validate=function(req,res){
	console.log('hello');
	if (isDuplicate(req.params.id)){
		res.json(200,{status:'ng'});
	}
	res.json(200,{status:'ok'});
};