
/*
 * GET home page.
 */

exports.index = function(req, res){
	console.log(req.get('User-Agent'));
  res.render('index', { title: 'babel' });
};