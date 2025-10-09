# Final Webware Project: 

Group 4 members:

Ryan Addeche
Elijah Gray
Lucas Marble
Grace Robinson
Nathaniel Schneider

## Project Description

Our project is a server that allows you to play the classic card game of Black Jack, where you can join in games with other players. In order to play, you must first login. In order to login you can either input a username and password, or you can use your github account to sign in instead, with the option on the bottom. Once you have logged in, you will be shown the game area, which includes a lot of pieces of information. At the top, there is a selection of rooms that you can switch between to play with people who are currently in the same room. On the left, there is the dealer's hand and your current hand. If you haven't placed a bet yet, you won't have anything in your hand. Every new user starts with 500 chips. You can bet in 10s up to your current chip count. Should you win the round, you win what you bet, but if you lose, you lose what you bet. At the bottom of the screen is the leaderboards of the top 10 players by chip count. Should you ever run out of chips, you have gone broke and will not be able to bet anymore. You can logout at any time, which will take you back to the login page.

How to play Blackjack:
The goal is to have a hand with the biggest value, but no over 21. All players are independent and face the dealer as their opponent. This game uses a standard 52 card deck. Players make bets to determine their winnings prior to starting. If you go over 21, you have "busted" meaning you have lost. Aces are situationally 11 or 1 depending on whether it being 21 will or won't cause your hand to go over 21, meaning aces will always be valued to your advantage. Face cards (Jack, Queen, and King) are worth 10. All numerical cards are worth their number in value. 
In the beginning, each player draws 2 cards to form their initial hand. The dealer likewise receives 2 cards. The players will then go first and make moves. The dealer will then take their turn. If the dealer busts, all players who did not bust will instantly win. Once all players are done the game will conclude and chips will be distributed accordingly for each player based on their bet and hand vs the dealer.
You have 3 options for each turn (Hit, Stand, and Double Down)
Hit - Receive a card. You can do this repeatedly. If you draw over 21, you will bust. Players have a disadvantage that they can bust before the dealer even draws. If the dealer and player both bust, the player still loses.
Stand - Refuse to draw anymore cards and keep your hand until the game concludes.
Double Down - Similar to stand, except you will double your initial bet.
If you draw 21 exactly (known as a blackjack), you will receive extra winnings.

To login, you can either use your github account, in which case it will ask you which github account you wish to connect and ask for permission for it to use your github account. If you don't wish to do that, you can make your own username and password. If the username and password you input already exist, you will sign into the account in question. If the username exists, but the password is incorrect, you will not be able to login. If the username does not exist, it will automatically register a new account for you.

## Technologies Used

We used React for the frontend, as it was something that most group mates were familiar with.

We used Bootstrap for CSS as it works well with React and provides a professional and clean look to our.

We used Node.js with Express for the backend server logic, allowing us to have authentication, real time updates, and queries.

We used WebSockets for the Backend logic to provide real time updates between players.

We used MongoDB for our database to store user accounts

We used GitHub authentication for an alternative method for signing in and better security

We hosted our project on Railway, which works well with MongoDB and GitHub Authentication and can link directly to a Github repository

## Challenges

Some of the challenges we faced include:

Connecting the game logic to the server and client. 
Making sure the database connection worked on everyone's devices.
Deployment onto Railway.

## Contributions

Lucas: Due to some personal events going on, Lucas wasn't able to contribute as much with the coding, but he did help with troubleshooting errors and figuring out what was wrong, checking and fixing edge cases, helped out with planning the server and game logic, wrote the majority of the readme, and recorded and edited the video.



1. A brief description of what you created, and a link to the project itself (two paragraphs of text)
2. Any additional instructions that might be needed to fully use your project (login information, etc.)
3. An outline of the technologies you used and how you used them.
4. What challenges you faced in completing the project.
5. What each group member was responsible for designing / developing.
6. What accessibility features you included in your project.

Think of 1, 3, and 4 in particular in a similar vein to the design / technical achievements for A1—A4. Make a case for why what you did was challenging and why your implementation deserves a grade of 100%.

The video described above is also due on Canvas at this time.


