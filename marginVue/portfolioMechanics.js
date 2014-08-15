$(function(){

  /*This is the section in which we declare all of the variables that will be used to display performance of the whole
  portfolio

  Count = # of equities in the portfolio
  Holdings = Current NAV in the portfolio
  Original Holdings = NAV of the portfolio at the beginning of the year
  Total Change = Change in value of the NAV of the portfolio from now to the start of the year.
  Open Total = Price at start of the trading day
  Total Change Percent = The change in the NAV of the portfolio based on current price compared
                          to the opening price.
  Total Change Percent YTD = The change in the NAV of the portfolio based on the current price
                              compared to the price to start the year.
  */
  window.count = 0;
  window.holdings = 0;
  window.originalHoldings = 0;
  window.totalChange = 0;
  window.openTotal = 0;
  window.totalChangePercent = 0;
  window.totalChangePercentYTD = 0;
  
  /* Initializes the gridster API that we can use in our porfolio box on the page */
  $(".gridster ul").gridster({
        widget_margins: [5, 5],
        widget_base_dimensions: [100, 100],
  });
  var gridster = $(".gridster ul").gridster().data('gridster');

  /* This is the Javascript code responsible for focusing on the Equity Index Input field 
   * then giving the button functionality. This is also the dense code that describes how
   * the autocomplete API taken from Markit works!
   */
  $("button").button(); 
  $("#symbolsearch")
      .focus()
      .autocomplete({
        source: function(request,response) {
          $.ajax({
            beforeSend: function(){ 
				
            },
            url: "http://dev.markitondemand.com/api/Lookup/jsonp",
            dataType: "jsonp",
            data: { 
              input: request.term
            },
            success: function(data) {
              response( $.map(data, function(item) {
                return {
                  label: item.Name + " (" +item.Exchange+ ")",
                  value: item.Symbol
                }
              }));
            }
          });
        },
		minLength: 2,
      });

  /* This is the code responsible for the form submit event, taking in the value of the equity
   * ticker symbol and then taking the quantity from that specific input field. At this point
   * a new instance of the QuoteService is created to run several different responses from.
   * i.e. (Success, renderAlert, quantityError)
   */

	$("form").submit(function(e){
	  e.preventDefault();
      $("button").button("loading");
      var ticker = $("#symbolsearch").val();
	  var quantity = $("#quantity_input").val();
      
      new Markit.QuoteService(ticker, function(jsonResult) {
        this.clearResult();
          //Catch errors
          if (!jsonResult.Data || jsonResult.Message){
            this.renderAlert(jsonResult);
            return;
          }
      //Throws an alert if the user inputs a quantity less that the minimum of 1 specified.
		  if (quantity < 1) {
			  this.quantityError();
      /*For testing purposes only (limits the equity count to less than 10 to make sure everything
        is working)*/
		  } else {
          if (window.count < 10) {
            this.success(jsonResult, gridster);
			this.changeTotalPerformance;
            window.count++;
          }
		  }
        });
    });
  });
  
  /* Function: QuoteService.quantityError
   * -------------------------------------
   * This is the function that is responsible for returning the alert when a user chooses to input a quantity less
   * than 1
   */
  Markit.QuoteService.prototype.quantityError = function() {
	  $("form").addClass("error");
	  $("form").before("<div class='alert alert-error'><a class='close' data-dismiss='alert'>&times;</a>The quantity you have entered is below the 1 share minimum. Please increase share quantity to include specified stock in your portfolio!</div>");
	  $("div.alert").alert();
  }
	 
   /* Function: QuoteService.clearResult
    * -------------------------------------
    * This is the function that is responsible for clearing all of the fields that are submitted when "Get Quote"
    * is posted
    */
  Markit.QuoteService.prototype.clearResult = function(){
    this.resetForm();
    $("#resultContainer").remove();
    $("div.alert").remove();
	$("#resultTPContainer").remove();
  };

    /* Function: QuoteService.resetForm
     * -------------------------------------
     * This is the function that is responsible for resetting the form after the database has been successfully queried and
     * the proper information has been returned to the user
     */
  Markit.QuoteService.prototype.resetForm = function(){
    $("button").button("reset");
    $("form").removeClass("error");
    $("#symbolsearch")
    .val($("#symbolsearch").val().toUpperCase())
    .select()
    .focus();
  };

  /* Function: QuoteService.success
   * ---------------------------------------
   * This is the function that is responsible for engaging in the arduous process of updating the individual equity tables
   * the total portfolio and the equityWell that holds all of the inputted equities, their ticker symbol and their current
   * price. It also resets the form so that the user can input the next equity without having to delete the old placeholder
   * text.
   */

  Markit.QuoteService.prototype.success = function(jsonResult){
    //Takes in the quantity of the stock requested and stores that.
    var quantity = $("#quantity_input").val();

    //Adds the Equity information on the screen with the updated information
	var $container = $("<div class='hide' id='resultContainer' />");
    $container.append("<h4>"+jsonResult.Data.Name+" ("+jsonResult.Data.Symbol+")</h4>");
    $container.append(this.renderResultTable(jsonResult));
    $("#equitySide").append($container);
    $container.fadeIn('fast');
	
  //Influences the global variables that help keep track of the portfolio information
	window.holdings += jsonResult.Data.LastPrice * quantity;
	window.originalHoldings += jsonResult.Data.ChangeYTD * quantity;
	window.openTotal += jsonResult.Data.Open * quantity;
	window.totalChange += (jsonResult.Data.LastPrice - jsonResult.Data.ChangeYTD) * quantity;
	window.totalChangePercent = (window.holdings-window.openTotal)/window.openTotal*100;
	window.totalChangePercentYTD = (window.holdings-window.originalHoldings)/window.originalHoldings*100;
	
  //Adds the total portfolio information on the screen with the updated information
	var $tpContainer = $("<div class='hide' id='resultTPContainer' />");
	$tpContainer.append(this.changeTotalPerformance(jsonResult));
	$("#portfolioSide").append($tpContainer);
	$tpContainer.fadeIn('fast');
	
  //Adds the gridster functionality to the screen and creates a new gridster widget to hold the information for the specific equity
  var gridster = $(".gridster ul").gridster().data('gridster');
	gridster.add_widget('<li class="portfolioEquity"'+'id="equity'+window.count+'"><h3>'+jsonResult.Data.Symbol+"<br>$"+jsonResult.Data.LastPrice.toFixed(2)+"</h3></li>", 1, 1);
	var $currentEquity = $("#equity"+window.count+"");
  $currentEquity.prepend("<div><button id='equityClose' type='button' class='close'> &times </button></div>");
	
  //This is adds the color animation functionality to the equity for the gridster widget that appears within the well
  if (jsonResult.Data.ChangePercentYTD > 20) {
      $currentEquity.animate({ backgroundColor: "#007C21", color: "#CFCFCF"}, 750 );
	} else if (jsonResult.Data.ChangePercentYTD >= 10 && jsonResult.Data.ChangePercentYTD < 20) {
	  $currentEquity.animate({ backgroundColor: "#00BF32;", color: "#151515"}, 750 );
	} else if (jsonResult.Data.ChangePercentYTD >=0 && jsonResult.Data.ChangePercentYTD < 10) {
	  $currentEquity.animate({ backgroundColor: "#64DF85", color: "#151515"}, 750 );
	} else if (jsonResult.Data.ChangePercentYTD < 0 && jsonResult.Data.ChangePercentYTD >= -10) {
		$currentEquity.animate({ backgroundColor: "#FF8673;", color: "#151515"}, 750 );
	} else if (jsonResult.Data.ChangePercentYTD < -10 && jsonResult.Data.ChangePercentYTD > -20) {
		$currentEquity.animate({ backgroundColor: "#FF2300;", color: "#151515"}, 750 );
    } else {
      $currentEquity.animate({ backgroundColor: "#A61700;", color: "#151515"}, 750 );
    }
    this.resetForm();
  };

  /* Function: QuoteService.renderAlert
   * ------------------------------------
   * This is the function responsible for throwing an alert depending on an error that the database
   * recieves when a query is made
   */
  Markit.QuoteService.prototype.renderAlert = function(jsonResult){
    $("form").addClass("error");
    $("form").before("<div class='alert alert-error'><a class='close' data-dismiss='alert'>&times;</a>"+jsonResult.Message+"</div>");
    $("div.alert").alert();
  };

  /* Function: QuoteService.renderResultTable
   * -------------------------------------
   * This is the function responsible for rendering the table that is used to show the equity information
   * on the left side of the screen. It creates several new arrays that are filled in with returned information
   * from the Markit API. These values, and their corresponding text are then pushed into table and returned
   * to the caller.
   */

  Markit.QuoteService.prototype.renderResultTable = function(jsonResult){
    var $table = $("<table />"),
    $thead = $("<thead />"),
    $tbody = $("<tbody />"),
    //Different Table Vriables
    lastPrice = [];
    changeInPrice = [];
    changeDailyPercent = [];
    changePercentYTD = [];
    tableCells = [];
    marketCap = [];
    
    lastPrice.push("<tr>");
    lastPrice.push("<th>Last Price</th>");
    lastPrice.push("<th>$"+jsonResult.Data.LastPrice+"</th>");
    lastPrice.push("</tr>");

    changeInPrice.push("<tr>");
    changeInPrice.push("<td><strong>Change In Price</strong></td>");
    changeInPrice.push("<td><strong>$"+jsonResult.Data.Change.toFixed(2)+"</strong></td>");
    changeInPrice.push("</tr>");

    changeDailyPercent.push("<tr>");
    changeDailyPercent.push("<td><strong>Change In Percent</strong></td>");
    changeDailyPercent.push("<td><strong>"+jsonResult.Data.ChangePercent.toFixed(2)+"%</strong></td>");
    changeDailyPercent.push("</tr>");

    changePercentYTD.push("<tr>");
    changePercentYTD.push("<td><strong>Change In Percent YTD</strong></td>");
    changePercentYTD.push("<td><strong>"+jsonResult.Data.ChangePercentYTD.toFixed(2)+"%</strong></td>");
    changePercentYTD.push("</tr>");

    marketCap.push("<tr>");
    marketCap.push("<td><strong>Market Cap ($Bil)</strong></td>");
	var marketCapDouble = jsonResult.Data.MarketCap.toFixed(2);
	var billion = 1000000000;
	var trueMarketCap = marketCapDouble/billion;
    marketCap.push("<td><strong>$"+trueMarketCap+"</strong></td>");
    marketCap.push("</tr>");

    $table.addClass("table table-bordered");      
    $thead.append(lastPrice.join(""));
    $tbody.append(changeInPrice.join(""));
    $tbody.append(changeDailyPercent.join(""));
    $tbody.append(changePercentYTD.join(""));
    $tbody.append(marketCap.join(""));

    $table.append($thead).append($tbody);

    return $table;
  };
  
  /* Function: QuoteService.changeTotalPerformance
   * ----------------------------------------------
   * This is the function responsible for rendering the total performance table that shows information for
   * the whole portfolio. It also pulls information, but rather calls more on the global variables that
   * are tracking the past performance of the portfolio and recalculating the values over the long haul.
   * These values are then returned in the table and used in the QuoteService.success function call
   * Certainly no difficult algebra that is involved here XDDD
   */

  Markit.QuoteService.prototype.changeTotalPerformance = function(jsonResult) {
	var $tpTable = $("<table />"),
    $thead = $("<thead />"),
    $tbody = $("<tbody />"),
	//Variables kept track of in the table
  accountValue = [];
	totalChangeInPrice = [];
	totalChangeInPercent = [];
	totalChangeInPercentYTD = [];
	
	accountValue.push("<tr>");
    accountValue.push("<th>Account Value</th>");
    accountValue.push("<th>$"+window.holdings.toFixed(2)+"</th>");
    accountValue.push("</tr>");
	
	totalChangeInPrice.push("<tr>");
    totalChangeInPrice.push("<th>Total Change in Price</th>");
    totalChangeInPrice.push("<th>$"+window.totalChange.toFixed(2)+"</th>");
    totalChangeInPrice.push("</tr>");
	
	totalChangeInPercent.push("<tr>");
    totalChangeInPercent.push("<th>Daily Percentage Change</th>");
    totalChangeInPercent.push("<th>"+window.totalChangePercent.toFixed(2)+"%</th>");
    totalChangeInPercent.push("</tr>");
	
	totalChangeInPercentYTD.push("<tr>");
    totalChangeInPercentYTD.push("<th>Total Change in Percent YTD</th>");
    totalChangeInPercentYTD.push("<th>"+window.totalChangePercentYTD.toFixed(2)+"%</th>");
    totalChangeInPercentYTD.push("</tr>");
	
	$tpTable.addClass("table table-bordered");      
    $thead.append(accountValue.join(""));
    $tbody.append(totalChangeInPrice.join(""));
    $tbody.append(totalChangeInPercent.join(""));
    $tbody.append(totalChangeInPercentYTD.join(""));

    $tpTable.append($thead).append($tbody);

    return $tpTable;
  };

  Markit.QuoteService.prototype.formatChgPct = function(chg){
    //the quote API returns negative numbers already,
    //so we just need to add the + sign to positive numbers
    return (chg <= 0) ? chg.toFixed(2) : "+" + chg.toFixed(2);  
  };

/* Reference Colors!!!
positiveChange1 --> #64DF85;
positiveChange2 --> #00BF32;
positiveChange3 --> #007C21;

negativeChange1 --> #FF8673;
negativeChange2 --> #FF2300;
negativeChange3 --> #A61700;
*/