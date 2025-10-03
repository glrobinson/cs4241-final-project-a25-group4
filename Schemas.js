//SCHEMAS
import mongoose from "mongoose";

// https://www.mongodb.com/docs/drivers/node/current/integrations/mongoose-get-started/?msockid=06191ef04741645a084d08da46f66594
// https://mongoosejs.com/docs/schematypes.html
// mongoose explanation.

// USER SCHEMA.
const User_schema = new mongoose.Schema({
    name: {type: String, required: true, unique: true},
    password: {type: String, required: true}, // probably should be hashed
    chips: {type: Number, default: 500, required: true},
    // Ranking? for leaderboard.
    // last_game ID?
    // implicit _id used for monogdb's internal system.
});
const User = mongoose.model('User', User_schema);

const Game_schema = new mongoose.Schema({

    // the pot.
    chips_pool: {type: Number, default: 0, required: true}, // the pool is a value that is default at 0

    // idea: keep track of players associated with a game, could enable reconnecting.
    // an array of user_ids
    // mongoose.Schema.Types.ObjectId is basically the generated ID by monogdb for each object in the database.
    players: {
        type: [
            {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
        ],
        required: true,
        // could use validate to add more checks.
    },

    // idea: state management for the game.
    game_state: {
        type: String,
        enum: ['setup', 'in_progress', 'over'], // this locks in these as the only options
        default: 'setup', // games will be in setup by default.
        required: true
    },

    // Idea use user._id.toString() for keys in a bets map.
    // I havent done this with mongoose so the syntax might be off
    player_bets: {
        type: Map,
        of: {type: Number, min: 0, default: 0},
        default: {},
    }

    // idea of usage:
    //const userId = someUser._id.toString(); // keys must be strings
    //game_instance.player_bets.set(id, 50);
    //game.save();

})
const Game = mongoose.model('Game', Game_schema);

export {User, Game};