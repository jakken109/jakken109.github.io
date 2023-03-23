//Wait for window to load fully, then call main()
window.onload = main();

function main()
{
    //Pull auction data with the parameters
    get_auctions({name:"breath of harmony", exact:"true"});
    get_auctions({name:"blue diamond", exact:"true"});
    get_auctions({name:"diamond", exact:"true"});
}


function get_auctions(options)
{
    var full = true;
    //Default server. Change to new server name
    var server = "yelinak";
    //Encode spaces in the text as %20 to allow it to work in a URL
    var searchTerm = encodeURI(options.name);

    //Default variables for full query if arguments aren't found
    var saleType = "saleType" in options ? options.saleType : "sell";
    var exact = "exact" in options ? options.exact : "false";
    
    full ? url = `https://api.tlp-auctions.com/GetSalesLogs?pageNum=1&pageSize=99&searchTerm=${searchTerm}&filter=${saleType}&exact=${exact}&serverName=${server}`
        : url = `https://api.tlp-auctions.com/PriceCheck?serverName=${server}&searchText=${searchTerm}`;

    //Query the API, and once a response is found, send the result to parse_auctions()
    fetch(url)
    .then(response => {
        return response.json();
    })
    .then(api_data => {
        full ? parse_full_log(api_data['items'], options.name) : price_check(api_data);
    });
}



//More expensive "full log" data
function parse_full_log(auctions, query)
{
    //If no results are found, return
    if(auctions.length <= 0)
    {
        console.log("No results found for ");
        return;
    } 

    var table = new_table(query);

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
            continue;
        }
        console.log(`Item: ${itemName}, Price: ${krono} krono ${plat}pp , Seller: ${seller}, Time: ${timestamp}`);
        newdata = {item: itemName, krono: krono, plat: plat, seller: seller, time: timestamp}
        update_page(newdata, table);
        
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
    let time_col = row.insertCell(2);

    name_col.innerText = newdata.item;
    price_col.textContent = price;
    seller_col.textContent = newdata.seller;
    time_col.textContent = newdata.time; // add parse time too

}

function new_table(query)
{
    let container = document.getElementById("auctiondiv");

    let table = document.createElement('table');
    table.className = "auctiontable";
    container.appendChild(table);
    table.innerHTML = `
    <tr><th colspan="4">'${query}'</th></tr>
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

        console.log(`Price: ${price}pp, Seller: ${seller}, Time: ${timestamp}`);
    }
}