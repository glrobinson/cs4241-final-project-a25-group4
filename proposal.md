# Webware Final Project Proposal 

## Final Project Group 4 

Ryan Addeche, Elijah Gray, Grace Robinson, Lucas Marble, Nate Schneider 

September 30, 2025 

## Blackjack 

In our application, users will be able to register for an account and during account creation they will be awarded 500 starting chips. The target audience for this application are gamers and students. To ensure the application is user friendly, the design will be clean and intuitive to make sure navigation and usability is clear. We want to make sure that all features involved in this application add to the user experience.  

The features that this application will include are account creation, playing a game, and checking the leaderboard. After creating an account, users have the option to join one of three game rooms. If they join a game room at the same time as another user, they will be able to play with other users. For each hand in blackjack users will be able to bet in increments of 10. The users will be able to hit, stand, or double down which follows standard Blackjack rules. To ensure that there is fairness and consistency, each hand will be resolved on the server side. Also, in the database, chips will be updated so that users balance remains present even after reloading or signing off. Users will also be able to check the leaderboard to compare their number of chips to other players. 

## Technologies/Libraries 

For the technical side of this application, below is a breakdown of the different technologies/libraries that we intent to use and how we plan to utilize them: 

* React for the Frontend 

  * Reusable components will be useful for the multiple cards in the game 
  * Most popular front-end framework, most group mates are familiar with React 

* Bootstrap for CSS 

  * Bootstrap works well with React and makes the design look clean and professional 
  * We all have experience using Bootstrap 

* Node.js with Express for Backend 

  * Node.js will be used to allow us to integrate multiplayer libraries 
  * Express will be used to handle routes for authentication, chip updates, and leaderboard queries 

* Socket.IO (WebSockets) for Backend 

  * Socket.IO will allow for us to be able to real time updates between players so they can see when cards are delt  
  * To ensure that same states update instantly 

* MongoDB for Database 

  * MongoDB will allow for us to store user accounts, balances, and gam history easily and quickly 

* GitHub authentication 

  * Allow for better security and additional sign in method for unique personal accounts 

* Host on Railway 

  * Free options and can link directly to GitHub repository 
  * Works easily with MongoDB and GitHub authentication 