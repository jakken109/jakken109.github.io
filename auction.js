const MIN_SEARCH_LENGTH = 3;
const SERVER = "yelinak";
const RESULT_LIMIT = 7;

var historyElements = [];


function main()
{
    generate_history();
}

function generate_history()
{
    //Get saved search history, and return if its empty
    let history = get_history();
    if(!history || !history[0]) return;
    //map over history to add a "history:true" key
    history = history.map(function(val) {
        val["history"] = "true";
        return val;
      });
    
    //Disable the search bar until we complete generating
    document.getElementById("search").disabled = true;

    get_auctions(history);
}

function search_item(input)
{
    if(input.search.value.length < MIN_SEARCH_LENGTH)
    {
        generate_error("Search must be minimum 3 characters")
        return;
    }
    //Disable the search bar until generation is complete
    document.getElementById("search").disabled = true;
    //Build a dictionary of values based on the input passed from the page
    let query = 
    {
        text    : input.search.value,
        exact   : input.exact.checked ? "true" : "false",
        save    : input.save.checked ? "true" : "false",
        filter  : input.filter.value
    }
    //Clear the search field to prepare for another search
    input.search.value = "";
    get_auctions(query);
    
}

/**Input a list of queries, and asynchronously return a dictionary containing a list of JSON objects, and a matching
 * list of metadata objects */
function get_auctions(query)
{
    if(!query.length) query = [query]; //Force query to be a list if it's a single object
    get_auctions_async(query)
    .then(responses =>{
            metadata = responses.metadata;
            return Promise.all(responses.promises.map(r => r.json()));
        })
    .then(jsonlist => {
        display_results({jsonlist:jsonlist, metadata:metadata});
    });
}

async function get_auctions_async(querylist)
{
    //Create an empty list of promises and metadata
    let requests = [];
    let metadata = [];
    //Iterate over the queries
    for (let i = 0; i < querylist.length; i++)
    {
        //Get the current query at i, and generate a URL based off the query
        let query = querylist[i];
        let url = create_url(query);
        if(url == null) continue;

        //Generate and display a dummy table, which will display until the promise is fulfilled
        let dummyTable = create_table(query, true);
        //create a promise and add it to the list of requests
        requests.push(fetch(url));
        metadata.push({query:query, table:dummyTable});
    }

    //wait for all the promises to resolve, then map the results to json
    let promises = await Promise.all(requests);
    return {promises:promises, metadata:metadata};
}

/**Generates an API request URL from a query dictionary*/
function create_url(query)
{
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


/** Input a dictionary containing a list of JSON objects, and a matching list of metadata.
 *  Process the data and update the appropriate HTML objects
 * {jsonlist:jsonlist, metadata:metadata}
 */
function display_results(auctions)
{
    for (let i = 0; i < auctions.jsonlist.length; i++)
    {
        //Generate a new table
        
        generate_auction_table(auctions.jsonlist[i], auctions.metadata[i].query);
        //Remove the dummy list
        auctions.metadata[i].table.remove();
    }
    
    document.getElementById("search").disabled = false;
}


//Takes an API response and a query, and updates the page to reflect the data
function generate_auction_table(api_data, query)
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
    
    if(api_data['items'].length <= 0)
    {
        //TODO put some kind of error message at the top of the page
        generate_error("No auctions found for that query");
        return false;
    } 

    let table = create_table(query);
    let row_count = create_rows(api_data['items'], table);

    if(row_count > 0) 
    {
        if(saving && !fromhistory) add_history(query); //Add query to history if this was not an auto-generated query
        if(saving || fromhistory) insert_history_element(table, query); //cache the element so it can be deleted later
        return true;
    }
    else
    {
        table.remove();
        generate_error("All items found had zero price.")
        return false;
    }

}

function create_rows(auctions, table)
{
        var new_rows = 0;

        for(let i = 0; i < auctions.length; i++)
        {
            var item = auctions[i];
            var plat = parseInt(item["plat_price"]);
            var krono = parseInt(item["krono_price"]);
            if((krono + plat) <= 0) continue;

            let row = table.insertRow(-1);
            //Generate new rows and populate them with the data
            row.insertCell(0).textContent = item["transaction_type"] ? "Buy" : "Sell";  //Filter type
            row.insertCell(1).textContent = item["item"];                               //Item name
            row.insertCell(2).textContent = parse_price(krono, plat);                   //Price in krono and platinum
            row.insertCell(3).textContent = item["auctioneer"];                         //Seller name
            row.insertCell(4).textContent = item["datetime"];                           //Timestamp in datetime format
            //TODO parse timestamp into a more legible format, or add "Time Since: 3 Hours Ago"
            new_rows++;
            //If we've reached our limit, stop processing items
            if(new_rows > RESULT_LIMIT) break;
        }

        return new_rows
}


function insert_history_element(table, query)
{
    historyElements = [{table, query}].concat(historyElements);
}

//Called by HTML
function remove_table(obj)
{
    remove_history_element(obj);
}

function remove_history_element(obj)
{
    //Index of the object relative to its parent
    let index = get_index(obj)
    //Cache the 'query' key of that element
    let targetQuery = historyElements[index].query;
    //Index of the matching query entry
    let history_index = get_history_index(targetQuery);

    //Get the current history dictionary
    var history = get_history();
    //Remove the object at history_index from the copy of the dictionary
    history.splice(history_index, 1);
    //update the local storage history list
    localStorage.setItem('history', JSON.stringify(history))
    //delete the calling object
    obj.remove();
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
function update_row(data, table)
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
    let loadingtext = "";
    if(dummy) loadingtext = `<tr colspan=2><th class="loadquery">Loading...<th><tr></tr>`;
    else if(column == "historycol")
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
    <tr><th colspan="100">'${query.text}' - Exact: ${query.exact}</th></tr>
    <tr>
        
        <th>Type</th>
        <th>Item</th>
        <th>Price</th>
        <th>Seller</th>
        <th>Date/Time</th>
    </tr>
    ${loadingtext}
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