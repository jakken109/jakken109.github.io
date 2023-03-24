const MIN_SEARCH_LENGTH = 3;
const SERVER = "yelinak";

var historyElements = [];

//test

function main()
{
    generate_history();
}

function generate_history()
{
    
    var history = get_history();
    //No history
    if(!history || history[0] == undefined) return;
    //Add history key to all entries to generate in the right column
    document.getElementById("search").disabled = true;
    for(let i = 0; i < history.length; i++)
    {
        history[i]["history"] = "true"
    }


    //call get_auctions on history, then call process_json when it completes
    let metadata;
    get_auctions(history)
    .then(responses =>
        {
            metadata = responses.metadata;
            return Promise.all(responses.promises.map(r => r.json()));
        }
        
        )
    .then(jsonlist => {
        process_json({jsonlist:jsonlist, metadata:metadata});
    });

}



/**Generates an API request URL from a query dictionary*/
function create_url(query)
{
    if(query.text.length < MIN_SEARCH_LENGTH)
    {
        generate_error("Search must be minimum 3 characters")
        return null;
    }

    var searchTerm = encodeURI(query.text);

    if(!"exact" in query) query["exact"] = "false";

    var filtertxt = "";
    if("filter" in query)
    {
        if (query.filter=="sell") filtertxt = "&filter=sell";
        else if (query.filter=="buy") filtertxt = "&filter=buy";
    }
    let url = `https://api.tlp-auctions.com/GetSalesLogs?pageNum=1&pageSize=50&searchTerm=${searchTerm}${filtertxt}&exact=${query.exact}&serverName=${SERVER}`
    return url;
}

/**Input a list of queries, and asynchronously return a dictionary containing a list of JSON objects, and a matching
 * list of metadata objects */
async function get_auctions(querylist)
{
    //Create an empty list of promises
    let requests = [];
    let metadata = [];
    //Iterate over the queries
    for (let i = 0; i < querylist.length; i++)
    {
        query = querylist[i];
        //Generate a query URL
        url = create_url(query);
        if(url == null) continue;
        dummyTable = create_table(query, true);
        //create a promise and add it to the list of requests
        requests.push(fetch(url));
        metadata.push({query:query, table:dummyTable});
    }

    //wait for all the promises to resolve, then map the results to json
    let promises = await Promise.all(requests);
    let result = {promises:promises, metadata:metadata};
    return result;


    
    
}

/** Input a dictionary containing a list of JSON objects, and a matching list of metadata.
 *  Process the data and update the appropriate HTML objects
 * {jsonlist:jsonlist, metadata:metadata}
 */
function process_json(auctions)
{
    //For each item in the list
    for (let i = 0; i < auctions.jsonlist.length; i++)
    {
        //parse the auction to generate tables
        parse_full_log(auctions.jsonlist[i], auctions.metadata[i].query);
        //delete the placeholder table
        auctions.metadata[i].table.remove();
    }
    document.getElementById("search").disabled = false;
    
}



//Takes an API response and a query, and updates the page to reflect the data
function parse_full_log(api_data, query)
{
    let saving = "save" in query && query.save == "true";
    let fromhistory = "history" in query && query.history == "true";

    //If this query is marked to be saved and is not from history
    if(saving && !fromhistory)
    {
            //Check if it is already in the history, and error if it is.
            index = get_history_index(query)
            if(index != null)
            {
                generate_error("This query is already in your saved queries at index " + index);
                return false;
            }
    }

    var auctions = api_data['items'];
    var display_limit = 7;
    if(auctions.length <= 0)
    {
        //TODO put some kind of error message at the top of the page
        generate_error("No auctions found for that query");
        return false;
    } 

    var table = create_table(query);

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
        var filter = item["transaction_type"] ? "Buy" : "Sell";
        var itemName = item["item"];
        var seller = item["auctioneer"];
        var timestamp = item["datetime"];
        
        //Compile the data into a dictionary and pass it to update_page to display
        display_data = {filter: filter, item: itemName, krono: krono, plat: plat, seller: seller, time: timestamp};
        update_page(display_data, table);
        new_rows++;
        
        //If we've reached our limit, stop processing items
        if(new_rows > display_limit) break;
    }

    //If the query generated at least 1 valid row
    if(new_rows > 0) 
    {
        //The query generated 1 or more valid rows
        //If its marked to be saved, add it to history with add-history
        //If its marked to be saved OR from history, add it to history elements
        //If query is marked to be saved and not from history, add it to history
        if(saving && !fromhistory) add_history(query);
        //If query is marked to be saved OR from history, add it to element list
        if(saving || fromhistory) insert_history_element({table:table, query:query});
    }
    //If the query generated no rows due to skipped priceless items, delete table and throw error
    else
    {
        table.remove();
        generate_error("All items found had zero price.")
    }
}

//insert into historyElements list
//New elements have higher numbers, lower elements have lower numbers.
//data is in the form of table:table, query:query
function insert_history_element(data)
{
    //Add the element to the front of the list
    historyElements = [data].concat(historyElements);
}

function remove_table(obj)
{
    //Find and remove the element from history
    remove_history_element(get_index(obj));
    //Remove the active object from the page
    obj.remove();
}

function remove_history_element(index)
{
    //Locate the element in the saved elements table, by index
    var targetElement = historyElements[index].table;
    //Cache the 'query' key of that element
    var targetQuery = historyElements[index].query;

    //Locate the index of the query in the local cache data
    var history_index = get_history_index(targetQuery);

    //Get the current history dictionary
    var history = get_history();

    //Remove the object at history_index from the copy of the dictionary
    history.splice(history_index, 1);
    //replace the localstorage dictionary with the updated dictionary
    localStorage.setItem('history', JSON.stringify(history))
}

function get_index(obj)
{
    //The list of children containing this element
    list = Array.from(obj.parentElement.children);
    //Return the index of the table in the list
    return list.indexOf(obj);
}


function generate_error(string)
{
    console.log("ERROR: "+string);
}


//Takes in a dictionary of display data, and a table to insert into
function update_page(data, table)
{
    //Cache column names for code readability
    let row = table.insertRow(-1);
    let filter = row.insertCell(0);
    let itemname = row.insertCell(1);
    let price = row.insertCell(2);
    let seller = row.insertCell(3);
    let time = row.insertCell(4);
    

    //Insert the data into the row
    filter.innerText = data.filter;
    itemname.innerText = data.item;
    price.textContent = parse_price(data.krono, data.plat);
    seller.textContent = data.seller;
    time.textContent = data.time; //TODO parse timestamp into a more legible format.
    //Add a "Time Since" like "3 hours ago"

}

//Returns a new table with headers and style, inserted at the top of the page
function create_table(query, dummy = false)
{
    //If query isn't flagged as "history" or "save"
    //display query in left column
    column = "";

    //If query is marked with history or save, display it in the right column
    if("history" in query && query.history == "true") column = "historycol";
    else if("save" in query && query.save == "true") column = "historycol";
    //otherwise display in the left column
    else column = "searchcol";

    let closeButton = "";
    if(column == "historycol" && !dummy)
    {
        closeButton = `
        <button type="button" class="xbutton" onClick="remove_table(this.parentElement)">
        <svg focusable=false viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g id="Menu / Close_LG"> <path id="Vector" d="M21 21L12 12M12 12L3 3M12 12L21.0001 3M12 12L3 21.0001" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g> </g></svg>
        </button>
        `;
    }
    let container = document.getElementById(column);
    let table = document.createElement('table');
    table.className = "auctiontable";
    container.insertBefore(table, container.firstChild);
    table.innerHTML = `
    ${closeButton}
    <tr><th colspan="5">'${query.text}' - Exact: ${query.exact}</th></tr>
    <tr>
        
        <th>Type</th>
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
    document.getElementById("search").disabled = true;
    //Get the values of the HTML inputs
    var text = input_query.search.value;
    var exact = input_query.exact.checked ? "true" : "false";
    var save = input_query.save.checked ? "true" : "false";
    var filter = input_query.filter.value;
    input_query.search.value = "";
    //Generate a dictionary to pass to the API
    //Format as a 1-item list for parsing purposes
    query = [{text:text, exact:exact, filter:filter, save:save, filter:filter}];

    get_auctions(query, process_json);
    
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

//Get the index of a particular query. Returns null if not found. Use for deleting specific queries by "query"
function get_history_index(query)
{
    //Cache the history from browser data
    var history = get_history();

    //If there is no history, then the query is not in history.
    if(!history) 
    {
        return null;
    }

    for (let i = 0; i < history.length; i++)
    {
        //Initialize match in the outer loop
        let match = null;

        for (let k in history[i])
        {
            //Skip the "history" and "save" tags
            if(k == "history" || k == "save") continue;

            //set match to be the index of the current dictionary
            match = i;
            //Found something that didn't match. Go to the next dictionary
            if (query[k] != history[i][k]) 
            {
                match = null;
                break;
            }
        }
        //If match wasn't reset to null, return the index of the match
        if(match != null) return match;
    }
    //No match returned after looping through the entire list
    return null;
}




//Add a query to the history in localstorage
function add_history(query)
{
    if(query.history) delete query.history; //Clean query to remove the history marker
    //Get the current history
    var history = get_history();
    //Remove the save key from history so it doesn't get saved
    delete query.save;
    //If there is no history, set history to a list containing a single dictionary
    if (!history) history = [query];

    //Add query to history (Should already be checked for duplicates)
    else history = history.concat([query]);

    //Add the updated history data to the local storage
    localStorage.setItem('history', JSON.stringify(history))
}


main();