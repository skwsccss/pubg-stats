/*
    * Returns a server rendered UI using EJS
    * Author: Abrar H Galib
*/
module.exports = function(express, ejs) {
    const uiRouter = express.Router();

    uiRouter.get('/', async (req, res, nxt) => {
        res.render('index', { /* ADD_FNS_HERE */});
    });
}