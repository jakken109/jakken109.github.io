function main()
{
    var history = getCookie("history").split(",");
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
    
    //Pull auction data with the parameters
    //get_auctions({name:"breath of harmony", exact:"true"});
    //get_auctions({name:"blue diamond", exact:"true"});
    //get_auctions({name:"diamond", exact:"true"});
}


function get_auctions(options)
{
    var full = true;
    //Default server. Change to new server name
    var server = "yelinak";
    //Encode spaces in the text as %20 to allow it to work in a URL
    var searchTerm = encodeURI(options.text);

    //Default variables for full query if arguments aren't found
    var saleType = "saleType" in options ? options.saleType : "sell";
    var exact = "exact" in options ? options.exact : "false";
    
    full ? url = `https://api.tlp-auctions.com/GetSalesLogs?pageNum=1&pageSize=50&searchTerm=${searchTerm}&filter=${saleType}&exact=${exact}&serverName=${server}`
        : url = `https://api.tlp-auctions.com/PriceCheck?serverName=${server}&searchText=${searchTerm}`;

    var query = {text:options.text, exact:exact, saleType:saleType}

    //Query the API, and once a response is found, send the result to parse_auctions()
    fetch(url)
    .then(response => {
        return response.json();
    })
    .then(api_data => {
        return parse_full_log(api_data['items'], query);
        //full ? parse_full_log(api_data['items'], query) : price_check(api_data); // This line allows to swap between functions
    });
}



//More expensive "full log" data
function parse_full_log(auctions, query)
{
    var display_limit = 7;
    //If no results are found, return
    if(auctions.length <= 0)
    {
        //TODO put some kind of error message at the top of the page
        console.log("No auctions found for that query");
        return false;
    } 

    var table = new_table(query);

    var new_rows = 0;
    //For every entry, log the name of the item
    for(let i = 0; i < auctions.length; i++)
    {
        
        var item = auctions[i];
        var itemName = item["item"];
        var seller = item["auctioneer"];
        var plat = item["plat_price"];
        var krono = item["krono_price"];
        var timestamp = item["datetime"];
        if(parseInt(krono) <= 0 && parseInt(plat) <= 0)
        {
            //console.log("NO VALUE");
            continue;
        }
        //console.log(`Item: ${itemName}, Price: ${krono} krono ${plat}pp , Seller: ${seller}, Time: ${timestamp}`);
        newdata = {item: itemName, krono: krono, plat: plat, seller: seller, time: timestamp}
        update_page(newdata, table);
        new_rows++;
        
        if(new_rows > display_limit) break;
    }

    if(new_rows > 0)
    {
        add_cookie(query)
    }

}

//TODO: Run this to update the page with the new auction data
function update_page(newdata, table)
{
    let price = parse_price(newdata.krono, newdata.plat);

    let row = table.insertRow(-1);

    let name_col = row.insertCell(0);
    let price_col = row.insertCell(1);
    let seller_col = row.insertCell(2);
    let time_col = row.insertCell(3);

    name_col.innerText = newdata.item;
    price_col.textContent = price;
    seller_col.textContent = newdata.seller;
    time_col.textContent = newdata.time; // parse into a better format, or change to "time since"

}

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

function parse_price(k, p)
{
    krono = parseInt(k);
    plat = parseInt(p);
    if(krono>0)
    {
        if(plat>0)
        {
            return `${krono}kr ${plat}pp`;
        }
        else
        {
            return `${krono}kr`;
        }
    }

    else
    {
        return `${plat}pp`;
    }
}




//Cheaper price check function
//Doesn't work for Krono priced items.
function price_check(data)
{
    //auctions['Auctions']
    //auctions['AveragePrice']
    //auctions['KronoPrice']
    //auctions['NoPriceData']
    var auctions = data['Auctions'];

    //If no results are found, return
    if(auctions.length <= 0)
    {
        console.log("No results found for ");
        return;
    } 

    //For every entry, log the name of the item
    for(let i = 0; i < auctions.length; i++)
    {
        var entry = auctions[i];
        var seller = entry['Auctioneer'];
        var price = entry["Price"];
        var timestamp = entry["AuctionDate"];

        //console.log(`Price: ${price}pp, Seller: ${seller}, Time: ${timestamp}`);
    }
}

function add_item(query)
{
    var text = query.searchbox.value;
    var exact = query.exactbox.checked ? "true" : "false";
    get_auctions({text:text, exact:exact})
    query.searchbox.value = "";
}

function add_cookie(query)
{
    var history = getCookie("history").split(",");

    if (history.includes(query.text) || query.text.length < 3)
    {
        return;
    }
    //Make a list of the current query
    var newsearch = [query.text];
    //Get a list of previous queries
    
    var newlist;

    //Make a new list of both combined lists
    if (history.length <= 1 && history[0] == "")
    {
        newlist = newsearch;
        
    }
    else
    {
        newlist = newsearch.concat(history);
    }
    //Set the cookie to that new list
    document.cookie = "history=" + newlist;
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

  main();