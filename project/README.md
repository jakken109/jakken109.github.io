# Everquest TLP Resource Website
#### Video Demo:  https://youtu.be/hvoHwk84Afo
#### Description:
This project is a reference page for the MMORPG "Everquest", and uses external queries and APIs to reference existing databases in an easier way.
The game itself is nearly 25 years old, and so there are already a lot of resources out there on the internet with data about the game.
Some of those websites don't have the best user interface design, or are lacking certain features which would make their use much easier.
Therefore, I've combined the ability to search on multiple external websites from one central page, rather than having to open several websites at once.

On the homepage, you will see three primary sections, as well as links to other pages.

#### Main Page (index.html)

Spell Search.
The spell search section allows you to simply enter a maximum level, and then click your class of choice. You will be immediately brought to the relevant page on the "eqitems" external website.

Item Search.
This section has two search boxes, one for EQtraders.com and one for Allakhazam.com, two very commonly searched websites for Everquest items.
Rather than trying to navigate their homepages individually, these searches will bring you directly there with a single click.

Group Level Range.
This is something that is referenced all the time while playing, to determine what level your characters can group with.
These charts are usually in an obscure subpage and difficult to find quickly, so I put it right on the homepage for quick and easy reference.


Additionally, there are 3 links in the top right.
The first will bring you back to the homepage.
The second will bring to to the "Map" page.
The third will bring you to the "Auctions" page.


#### Map Page (map.html, norrathmap-grey.png)

Most of the existing world maps are difficult to read, or hard on the eyes. They are also not always easy to find quickly, and usually are from the wrong era and contain misleading information.
I custom-made this map, and include it here for easy, concise reference.


#### Auctions Page (auctions.html, auction.js)

This is the most complicated and biggest feature of the website.
"tlp-auctions.com" is a website which combines data about items being sold in-game, and makes them searchable via their own website.
A major feature they are lacking is the ability to save searches and easily repeat them over time.
However, they offer an API which allows access to their real-time database.
I've used Javascript to allow you to query that API, and access items just like you would from their homepage.
But in addition, you have the option to save searches that you make.
When you reload the page, any previously saved searches will automatically be queried and displayed for you, without having to remember or repeat them manually.
You can choose to search by exact name or partial name, and filter by whether the sale is an offer to buy or to sell.
Currently the website uses an old database on a server called "Yelinak", but in May 2023 there will be a new server releasing, and this page will be updated to reflect information from that server instead.