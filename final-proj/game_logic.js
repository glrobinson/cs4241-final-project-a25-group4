//let suits = ['♠', '♥', '♦', '♣'];
//let ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
import readlineSync from 'readline-sync';

// Generate number card values automatically, populated by the 3 sections below.
const cardValues = {};

// numbers 2-10
for (let i = 2; i <= 10; i++) {
    cardValues[i.toString()] = i;
}

// royalty cards
['J','Q','K'].forEach(c => cardValues[c] = 10);

// ace initially counted as 11 (Can be equal to 1 situationally)
cardValues['A'] = 11;

// Build shuffled deck
function create_deck() {

    // in cards, there are 4 "suits"
    const suits = ['♠', '♥', '♦', '♣'];

    // in cards, there are 13 values
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    // NOTE:
    // aces are special in this game in that they are either 11 or 1, whichever works in your favor
    // staying under 21

    let deck = [];

    // make all possible cards
    for (let suit of suits) {
        for (let rank of ranks) {
            deck.push({rank, suit});
        }
    }

    //https://www.programiz.com/javascript/examples/shuffle-card
    // shuffle the deck
    // https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
    // 0-51 (52 cards)
    for (let i = 51; i > 0; i--) {
        let j = Math.floor(Math.random()* i);
        let temp = deck[i];
        deck[i] = deck[j];
        deck[j] = temp;
    }

    return deck;

}

// Draw card
function draw(deck) {

    if (deck == null || deck.length <= 0) {
        console.log("invalid usage of draw()")
        return null;
    }

    if (deck.length <= 0) {
        console.log("ERROR: draw(player, deck) in game_logic.js called when deck is empty!");
        return null;
    }

    let card = deck.pop();
    //console.log(player + " has drawn: " + card.rank + card.suit);
    return card
}


function hand_value(hand) {
    let total = 0;
    let aces = 0;

    for (let card of hand) {
        let value = cardValues[card.rank];
        total += value; // get value from map at the top of the js file.
        if (card.rank === 'A') aces++;
    }

    while (total > 21 && aces > 0) {
        total -= 10; // revert aces to 1 incrementally if were over.
        aces--;
    }

    return total;
}

function is_bust(hand_value) {
    let result = hand_value > 21;

    if (result) {
        //console.log("this hand is a bust!")
        return true;
    } else {
        //console.log("hand <= 21! (not a bust)")
        return false;
    }

}

function is_win(hand_value) {
    return hand_value === 21
}



// Hit = take another card from the deck

// Stand= end your turn without taking more card. Your current hand total is final.

// Double Down = at the start of your turn (after the first 2 cards).
// double your bet and draw exactly one more card

// atomic for each individual player between the dealer.
function resolve_hand(player_hand, dealer_hand, bet, double_down = false) {

    let result_mult = 0

    let double_down_multiplier = double_down ? 2 : 1;  // double down doubles bet

    let player_hand_value = hand_value(player_hand);
    let player_busted = is_bust(player_hand_value);

    // special dealer win.
    if (player_busted) { // dealer has an advantage in that if the player busted, they win automatically regardless.
        result_mult = -1
        console.log("player busted, they lose!")
        return bet * result_mult * double_down_multiplier;
    }

    let dealer_hand_value = hand_value(dealer_hand);
    let dealer_busted = is_bust(dealer_hand_value);

    // special blackjack victory condition.
    if (player_hand_value === 21 && player_hand.length === 2 && dealer_hand_value !== 21) {
        result_mult = 1.5
        console.log("player got a nat blackjack, they win big!")
        return bet * result_mult * double_down_multiplier;
    }

    if (dealer_busted) { // if the dealer busted, grant victory to the player.
        console.log("player wins, dealer busted!")
        result_mult = 1
    } else { // compare deck values to determine winner
        console.log("win decided by bigger hand!")
        result_mult = player_hand_value > dealer_hand_value ? 1 //players got a bigger hand
            : player_hand_value < dealer_hand_value ? -1 // player has smaller hand
            : 0; // tie
    }

    return bet * result_mult * double_down_multiplier;
}

/*
// testing.
console.log("testing block at line 159")

let new_deck = create_deck();

let player_hand = []

for (let i = 0; i < 2; i++) {
    let your_card = draw(new_deck);
    player_hand.push(your_card);
}

let result = hand_value(player_hand)
console.log("player's hand valued at: " + result)
//console.log(is_bust(result))


let dealer_hand = []

for (let i = 0; i < 2; i++) {
    let your_card = draw(new_deck);
    dealer_hand.push(your_card);
}

let result2 = hand_value(dealer_hand)
console.log("dealers's hand valued at: " + result2)
//console.log(is_bust(result2))


let bet_result = resolve_hand(player_hand, dealer_hand, 10, false)
console.log("bet result: " + bet_result)

console.log("testing block ending at line 190")
*/


const player_moves = Object.freeze({
    HIT: 0,
    STAND: 1,
    DOUBLE_DOWN: 2,
});

function parse_move(input) {
    input = input.trim().toUpperCase();

    switch(input) {
        case "HIT": return player_moves.HIT;
        case "STAND": return player_moves.STAND;
        case "DOUBLE_DOWN": return player_moves.DOUBLE_DOWN;
        default: return null; // invalid move
    }
}


// idea: make all user actions atomic so the server can handle each one independently easier.
class mock_user {

    constructor(name) {
        this.name = name;
        this.hand = [];
        this.chips = 500;
        this.bet = 0;
        this.ready_to_flip = false;
        this.double_down = false;
        this.has_gone = false;
    }

    flip_cards() {
        this.ready_to_flip = true;
    }

    reset() {
        this.ready_to_flip = false;
        this.double_down = false;
        this.has_gone = false;
        this.hand = [];
    }

    give_card(deck){
        let drawn_card = draw(deck);
        if (drawn_card == null) {
            throw("invalid card drawn!")
        }
        this.hand.push(drawn_card);
    }

    set_bet(number){
        const bet = Number(number);
        if (!Number.isInteger(bet)) {
            throw new Error(`ERROR - adjust_chips expects integer | inputted: ${bet}`);
        }
        this.bet = bet;
    }

    adjust_chips(number) {
        this.chips += number;
    }

    is_ready_to_flip() {
        return this.ready_to_flip
    }

    allow_new_turn(){
        this.has_gone = false;
    }

    player_has_played() {
        this.has_gone = true;
    }

    can_play_this_turn(){
        return !this.has_gone;
    }



    // return false if invalid move, return true if valid move.
    make_move(deck, move_type) {

        //Validate mov
        const allowedMoves = Object.values(player_moves);
        if (!allowedMoves.includes(move_type)) {
            console.log(`Invalid move: ${move_type}`);
            return false;
        }

        //execute desired move
        switch (move_type) {

            case player_moves.HIT:
                this.give_card(deck);

                let value = hand_value(this.hand)
                console.log(`${this.name} hits and now has ${value}`);

                if (is_bust(hand_value(this.hand))) this.flip_cards(); // bust ends user's run

                this.has_gone = true; // user has had a turn

                if (is_bust(value)) { // cannot do anything after bustin
                    this.flip_cards();
                }



                return true;

            case player_moves.STAND:
                this.flip_cards();

                console.log(`${this.name} stands at ${hand_value(this.hand)}`);

                this.has_gone = true; // user has had a turn

                return true;
            case player_moves.DOUBLE_DOWN:

                if (this.hand.length !== 2) {
                    console.log("user cannot double down, error")
                    return false;
                }

                this.double_down=true

                this.give_card(deck);

                console.log(`${this.name} doubles down and now has ${hand_value(this.hand)}`);

                this.flip_cards(); // ends user's run

                this.has_gone = true; // user has had a turn.

                return true;
            default:
                throw new Error(`Invalid move: ${move_type}`);
        }

    }


}

class dealer {

    constructor() {
        this.hand = [];
        this.ready_to_flip = false;
    }

    has_busted() {
        return hand_value(this.hand) > 21;
    }

    dealer_decision(deck) {
        const value = hand_value(this.hand);
        if (value < 17) {
            console.log(`dealer draws}`);
            this.give_card(deck);
            return player_moves.HIT;
        } else {
            console.log(`dealer does not draw}`);
            this.ready_to_flip = true;
            return player_moves.STAND;
        }
    }

    reset() {
        this.hand = [];
    }

    give_card(deck){
        let drawn_card = draw(deck);
        this.hand.push(drawn_card);
    }

}

class blackjack_game {

    constructor(){
        this.dealer = new dealer();
        this.deck = create_deck();
        this.turn_queue = [];
        this.round_over = false;
    }

    add_player(player) {
        if (!this.turn_queue.includes(player)) {
            this.turn_queue.push(player);
        }
    }

    remove_player(player) {
        // remove a player from the queue
        this.turn_queue = this.turn_queue.filter(p => p !== player);
    }

    current_player() {
        // find a player who hasn't gone or flipped, if none are found just return null
        let result = this.turn_queue.find(player => !player.is_ready_to_flip() && player.can_play_this_turn()) || null;
        return result;
    }

    execute_move(moveType) {
        const player = this.current_player();
        let move = parse_move(moveType)
        return player.make_move(this.deck, move);
    }

    prepare_new_turn() {
        this.turn_queue.forEach((player) => {
            player.allow_new_turn();
        });
    }

    reset_game() {
        this.turn_queue.forEach((player) => {
            player.reset();
        });
        this.deck = create_deck();
        this.dealer.reset();
    }


    deal_initial_cards() {
        //Give 2 cards to players
        this.turn_queue.forEach(player => {
            player.give_card(this.deck);
            player.give_card(this.deck);
        });
        // Give 2 to dealer
        this.dealer.give_card(this.deck);
        this.dealer.give_card(this.deck);
    }

    // game logic:
    // all players play then the dealer draws.
    // players can stand before others are done
    play_round(){

        let game_over = false

        this.turn_queue.forEach(player => {
            // temporary
            let bet = readlineSync.question(`${player.name}, what is your bet:`);
            player.set_bet(bet);
            console.log(`${player.name} bet: ${bet}`);
            //temp
        });

        // dealing of first two cards
        this.deal_initial_cards();

        while (game_over === false) {

            // players take actions.
            while (this.current_player() !== null) { // while there are players who haven't taken a turn, keep going.
                let player = this.current_player();

                // temporary for debug.
                console.log(`${player.name} current player: ${player.name}'s hand is worth: ${hand_value(player.hand)}`);

                let move = readlineSync.question(`${player.name}, choose your move (HIT/STAND/DOUBLE_DOWN):`);
                // temporary

                let valid = this.execute_move(move);

                player.player_has_played();

                console.log(`${player.name} executed (Valid?: ${valid}) move: ${move}`);
            }

            // dealer makes a decision.
            while(this.dealer.dealer_decision(this.deck) !== player_moves.STAND) { // dealer can repeatedly draw.
                console.log(`dealer's hand is worth: ${hand_value(this.dealer.hand)}`)
            }
            // dealer AI has to forfeit if it ends up busting after the players go.
            if (this.dealer.has_busted()) {
                console.log("Dealer has busted! ending game!")
                game_over = true;
                break;
            }

            this.turn_queue.forEach(player => {
                player.allow_new_turn();
            });

            if (this.dealer.ready_to_flip === true && this.current_player() === null) {
                console.log("No turns remaining, checking results....")
                break;
            }

        }

        // resolve bets
        this.turn_queue.forEach(player => {
            let result = resolve_hand(player.hand, this.dealer.hand, player.bet, player.double_down);
            player.adjust_chips(result);
            console.log(`${player.name} chips net: ${result}`);
        });

        this.reset_game();


    }


}

let player1 = new mock_user("john", 500);
let player2 = new mock_user("susan", 500);
let player3 = new mock_user("bill", 500);

let new_game = new blackjack_game();
new_game.add_player(player1);
new_game.add_player(player2);
new_game.add_player(player3);

new_game.play_round();

/*
john bet: 1is your bet:
susan, what is your bet:2
susan bet: 2
bill, what is your bet:3
bill bet: 3
john current player: john's hand is worth: 18
john, choose your move (HIT/STAND/DOUBLE_DOWN):stand
john stands at 18
john executed (Valid?: true) move: stand
susan current player: susan's hand is worth: 20
susan, choose your move (HIT/STAND/DOUBLE_DOWN):stand
susan stands at 20
susan executed (Valid?: true) move: stand
bill current player: bill's hand is worth: 14
bill, choose your move (HIT/STAND/DOUBLE_DOWN):hit
bill hits and now has 13
bill executed (Valid?: true) move: hit
dealer does not draw}
bill current player: bill's hand is worth: 13
bill, choose your move (HIT/STAND/DOUBLE_DOWN):hit
bill hits and now has 16
bill executed (Valid?: true) move: hit
dealer does not draw}
bill current player: bill's hand is worth: 16
bill, choose your move (HIT/STAND/DOUBLE_DOWN):hit
bill hits and now has 26
bill executed (Valid?: true) move: hit
dealer does not draw}
No turns remaining, checking results....
win decided by bigger hand!
john chips net: 0   <--- same hand
win decided by bigger hand!
susan chips net: 2
player busted, they lose!
bill chips net: -3

 */