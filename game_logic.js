let suits = ['♠', '♥', '♦', '♣'];
let ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];


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
function draw(deck, player = "debug_dealer") {

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
        total += cardValues[card.rank]; // get value from map at the top of the js file.
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