const MIN_SEARCH_LENGTH = 3;
const SERVER = "oakwynd";
const RESULT_LIMIT = 7;
HISTORY_ELEMENTS = [];


function main()
{
    //Get query history, tag each query with a "history" key, and search the list of queries
    search_list(get_history(true));
}


/**Takes in a list of queries, and attempts to search all of them at once*/
function search_list(querylist)
{
    if(!querylist || !querylist[0]) return;
    document.getElementById("search").disabled = true;
    get_auctions(querylist);
}

function search_item(input)
{
    if(input.search.value.length < MIN_SEARCH_LENGTH)
    {
        generate_error("ERROR: Search must be minimum 3 characters")
        return;
    }

    //Build a dictionary of values based on the input passed from the page
    let query = 
    {
        text    : input.search.value.toLowerCase(),
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
    //Disable the search bar until generation is complete
    document.getElementById("search").disabled = true;
    generate_error("Loading...");
    if(!query.length) query = [query]; //Force query to be a list if it's a single object
    get_auctions_async(query)
    .then(responses =>{
            metadata = responses.metadata;
            return Promise.all(responses.promises.map(r => r.json()));
        })
    .then(jsonlist => {
        document.getElementById("search").disabled = false;
        generate_error(false);
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




/** Input a dictionary containing a list of JSON objects, and a matching list of metadata.
 *  Process the data and update the appropriate HTML objects
 * {jsonlist:jsonlist, metadata:metadata}
 */
function display_results(auctions)
{
    for (let i = 0; i < auctions.jsonlist.length; i++)
    {
        generate_auction_table(auctions.jsonlist[i], auctions.metadata[i].query);
        auctions.metadata[i].table.remove();
    }
    
    document.getElementById("search").disabled = false;
}


//Takes an API response and a query, and updates the page to reflect the data
function generate_auction_table(api_data, query)
{
    let saving = "save" in query && query.save == "true";
    let fromhistory = "history" in query && query.history == "true";

    //If this query marked to be saved, stop here if it's already in history
    if(saving && !fromhistory && get_history_index(query) != null)
    {
        generate_error("ERROR: This query is already in your saved searches");
        return false;
    }
    if(api_data['items'].length <= 0)
    {
        generate_error("ERROR: No auctions found for that search");
        return false;
    } 

    let table = create_table(query);
    let row_count = create_rows(api_data['items'], table);

    if(row_count > 0) 
    {
        if(saving || fromhistory)
        {
            insert_history_element(table, query); //cache the element so it can be deleted later
            if(!fromhistory) add_to_history(query); //Add query to history if this was not an auto-generated query
        }
        return true;
    }
    else
    {
        table.remove();
        generate_error("ERROR: All items found had no price data")
        return false;
    }

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
    let rightpx = "22px";
    if(dummy) 
    {
        loadingtext = `<tr><th colspan=100 class="loadquery">Loading...</th></tr>`;
        rightpx = "54px";
    }
    else if(column == "historycol")
    {
        closeButton = `
        <button type="button" class="xbutton" onClick="remove_from_history(this.parentElement.parentElement.parentElement)">
        <svg focusable=false viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g id="Menu / Close_LG"> <path id="Vector" d="M21 21L12 12M12 12L3 3M12 12L21.0001 3M12 12L3 21.0001" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g> </g></svg>
        </button>
        `;
    }
    let container = document.getElementById(column);
    let table = document.createElement('table');
    table.className = "auctiontable";
    container.insertBefore(table, container.firstChild);
    table.innerHTML = `
    <tr><td style="border:0">${closeButton}</td><th colspan="100"><label style="position:relative; right:${rightpx}; font-size:125%">'${query.text}'</label></th></tr>
    
    <tr><th colspan="100"><i><label style="position:relative; right:20px">Filter: ${query.filter}</label><label style="position:relative; left:20px">Exact: ${query.exact == "true" ? "Yes": "No"}</label></i></th></tr>
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

function create_rows(auctions, table)
{
        var new_rows = 0;

        for(let i = 0; i < auctions.length; i++)
        {
            var item = auctions[i];
            var plat = parseInt(item["platPrice"]);
            var krono = parseInt(item["kronoPrice"]);
            if((krono + plat) <= 0) continue;

            let row = table.insertRow(-1);
            //Generate new rows and populate them with the data
            row.insertCell(0).textContent = item["transactionType"] ? "Buy" : "Sell";  //Filter type
            row.insertCell(1).textContent = item["item"];                               //Item name
            row.insertCell(2).textContent = format_price(krono, plat);                   //Price in krono and platinum
            row.insertCell(3).textContent = item["auctioneer"];                         //Seller name
            row.insertCell(4).textContent = item["datetime"];                           //Timestamp in datetime format
            //TODO parse timestamp into a more legible format, or add "Time Since: 3 Hours Ago"
            new_rows++;
            //If we've reached our limit, stop processing items
            if(new_rows > RESULT_LIMIT) break;
        }

        return new_rows
}



/**
 * 
 * Helper Functions
 * 
 */

/**Generates an API request URL from a query dictionary*/
function create_url(query)
{
    var searchTerm = encodeURI(query.text);

    if(!"exact" in query) query["exact"] = "false";

    var filtertxt = "";
    if("filter" in query)
    {
        if (query.filter=="Sell") filtertxt = "&filter=sell";
        else if (query.filter=="Buy") filtertxt = "&filter=buy";
    }
    let url = `https://api.tlp-auctions.com/SalesLog?pageNum=1&pageSize=50&searchTerm=${searchTerm}${filtertxt}&exact=${query.exact}&serverName=${SERVER}`
    return url;
}

/**Returns the index of an HTML object within its parent element*/
function get_index(obj)
{
    //The list of children containing this element
    let list = Array.from(obj.parentElement.children);
    //Return the index of the table in the list
    return list.indexOf(obj);
}

//TODO: Make this add red text at the top of the page, instead of console logging
/**Generate an error and display it to the user*/
function generate_error(string)
{
    if(!string)
    {
        document.getElementById("errortext").parentElement.style.visibility = "hidden";
        return;
    }
    errortext = document.getElementById("errortext");
    errortext.parentElement.style.visibility = "visible";
    errortext.textContent = string;
    console.log(string);

}

/**Cache a table a corresponding query, in order to track and delete it later*/
function insert_history_element(table, query)
{
    HISTORY_ELEMENTS = [{table, query}].concat(HISTORY_ELEMENTS);
}

/**Takes 2 INTs (krono, platinum) and returns them as a string*/
function format_price(krono, plat)
{
    if(krono>0)
    {
        if(plat>0) return `${krono}kr ${plat}pp`;
        else return `${krono}kr`;
    }
    else return `${plat}pp`;
}


/**Returns a JSON object containing the search history from localstorage*/
function get_history(addtag)
{
    let data = localStorage.getItem('history');
    if(!data) return null;
    data = JSON.parse(data);

    if(addtag)
    {
        data = data.map(function(val) {
            val["history"] = "true";
            return val;
          });
    }

    return data;
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



/**Takes in a query, and saves it to the localstorage search history*/
function add_to_history(query)
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


/**Takes an HTML object and deletes it from the page and from history */
function remove_from_history(obj)
{
    //Index of the object relative to its parent
    let index = get_index(obj)
    //Cache the 'query' key of that element
    let targetQuery = HISTORY_ELEMENTS[index].query;
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




main();