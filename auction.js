function main()
{
    var history = get_history();
    if(!history) return;
    
    for(let i = 0; i < history.length; i++)
    {
        get_auctions(history[i]);
    }
    /*
    if(history.length <= 1 && history[0] == "") 
    {
        console.log("Blank Cookie");
        return;
    }

    console.log(history.length);

    for(let i = 0; i < history.length; i++)
    {
        console.log("Searching for "+i+history[i])
        get_auctions({text:history[i], exact:"false"})
    }
    */
    
    //Pull auction data with the parameters
    //get_auctions({name:"diamond", exact:"true"});
}


//Takes a query {text:string exact:string saleType:string} and returns an API response
function get_auctions(query)
{
    var server = "yelinak";
    var searchTerm = encodeURI(query.text);

    //Set defaults to the query if it's not fleshed out
    var text = query.text;
    var saleType = "saleType" in query ? query.saleType : "sell";
    var exact = "exact" in query ? query.exact : "false";

    //Update query with the new information, if it was missing
    query = {text:text, exact:exact, saleType:saleType}
    
    url = `https://api.tlp-auctions.com/GetSalesLogs?pageNum=1&pageSize=50&searchTerm=${searchTerm}&filter=${saleType}&exact=${exact}&serverName=${server}`;
    /* Code to run a different URL for different API search
    full ? url = `https://api.tlp-auctions.com/GetSalesLogs?pageNum=1&pageSize=50&searchTerm=${searchTerm}&filter=${saleType}&exact=${exact}&serverName=${server}`
        : url = `https://api.tlp-auctions.com/PriceCheck?serverName=${server}&searchText=${searchTerm}`;
    */


    //Query the API, and once a response is found, send the result to parse_auctions()
    fetch(url)
    .then(response => {
        return response.json();
    })
    .then(api_data => {
        return parse_full_log(api_data, query);
        //full ? parse_full_log(api_data['items'], query) : price_check(api_data); // This line allows to swap between functions
    });
}



//Takes an API response and a query, and updates the page to reflect the data
function parse_full_log(api_data, query)
{
    var auctions = api_data['items'];
    var display_limit = 7;
    if(auctions.length <= 0)
    {
        //TODO put some kind of error message at the top of the page
        console.log("No auctions found for that query");
        return false;
    } 

    var table = new_table(query);

    //Keep track of how many rows have generated, to allow skipping items with no price
    var new_rows = 0;

    //Iterate through the list of auctions
    for(let i = 0; i < auctions.length; i++)
    {
        //Cache the current item in a variable
        var item = auctions[i];
        //Cache the price data; If there is no price, skip this item
        var plat = item["plat_price"];
        var krono = item["krono_price"];
        if(parseInt(krono) <= 0 && parseInt(plat) <= 0) continue;

        //Cache the rest of the item data
        
        var itemName = item["item"];
        var seller = item["auctioneer"];
        var timestamp = item["datetime"];
        
        //Compile the data into a dictionary and pass it to update_page to display
        display_data = {item: itemName, krono: krono, plat: plat, seller: seller, time: timestamp}
        update_page(display_data, table);
        new_rows++;
        
        //If we've reached our limit, stop processing items
        if(new_rows > display_limit) break;
    }

    //If the query generated rows, add this query to the history
    if(new_rows > 0) add_history(query);
}


//Takes in a dictionary of display data, and a table to insert into
function update_page(data, table)
{
    //Cache column names for code readability
    let row = table.insertRow(-1);
    let itemname = row.insertCell(0);
    let price = row.insertCell(1);
    let seller = row.insertCell(2);
    let time = row.insertCell(3);

    //Insert the data into the row
    itemname.innerText = data.item;
    price.textContent = parse_price(data.krono, data.plat);
    seller.textContent = data.seller;
    time.textContent = data.time; //TODO parse timestamp into a more legible format.
    //Add a "Time Since" like "3 hours ago"

}

//Returns a new table with headers and style, inserted at the top of the page
function new_table(query)
{
    let container = document.getElementById("auctiondiv");
    let table = document.createElement('table');
    table.className = "auctiontable";
    container.insertBefore(table, container.firstChild);
    table.innerHTML = `
    <tr><th colspan="4">'${query.text}' - Exact: ${query.exact}</th></tr>
    <tr>
        <th>Item</th>
        <th>Price</th>
        <th>Seller</th>
        <th>Date/Time</th>
    </tr>
    `;

    return table;
}

//Converts a number of kronos and number of platinum into a readable string
function parse_price(k, p)
{
    krono = parseInt(k);
    plat = parseInt(p);
    if(krono>0)
    {
        if(plat>0) return `${krono}kr ${plat}pp`;
        else return `${krono}kr`;
    }
    else return `${plat}pp`;
}


function search_item(input_query)
{
    
    //Get the values of the HTML inputs
    var text = input_query.search.value;
    var exact = input_query.exact.checked ? "true" : "false";
    var saleType = "sell"; //Todo
    
    //Generate a dictionary to pass to the API
    query = {text:text, exact:exact, saleType:saleType};

    console.log(query);
    //If this query is already in the history, then don't search it
    //TODO display an error on the top that this is already in the history
    if (!in_history(query))
    {
        get_auctions(query);
    }
    
    input_query.search.value = "";
    
}

//Parse and return a list of dictionaries from browser local storage
function get_history()
{
    var data = localStorage.getItem('history');
    if(!data)
    {
        return null;
    }
    return JSON.parse(data);
}

//Check if a query is a match for any queries already in the history
function in_history(query)
{
    var history = get_history();

    //If there is no history, then the query is not in history.
    if(!history) return false;

    for (let i = 0; i < history.length; i++)
    {
        match = true;
        for (let k in history[i])
        {
            //Found something that didn't match. Go to the next dictionary
            if (query[k] != history[i][k]) 
            {
                match = false;
                break;
            }
        }
        //If match is still true after checking this dictionary, then we found a match
        if(match) return true;
    }
    return false;
}


//Add a query to the history in localstorage
function add_history(query)
{
    //Get the current history
    var history = get_history();
    //If there is no history, set history to a list containing a single dictionary
    if (!history) history = [query];


    else
    {
        //If there is history, make sure it doesn't already contain our query
        //If not, then add the query to history
        if(!in_history(query)) history = history.concat([query]);

        //If the query is already in history, then don't add anything
        else return false;
  
        
    }
    //Add the updated history data to the local storage
    localStorage.setItem('history', JSON.stringify(history))
}


main();