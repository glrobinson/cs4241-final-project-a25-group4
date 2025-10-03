let suits = ['♠', '♥', '♦', '♣']
let ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']

let deck = []

for (let suit of suits) {
    for (let rank of ranks) {
        deck.push(rank + suit);
    }
}


console.log(deck);
