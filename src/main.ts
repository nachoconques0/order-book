
"use strict";

import { v4 } from "uuid";
import * as _ from "lodash";

const ORDER_TYPE_BID:string = "BID"
const ORDER_TYPE_ASK:string = "ASK"

type OrderType = typeof ORDER_TYPE_ASK | typeof ORDER_TYPE_BID
type Positions = Array<Position>
type Orders = Array<Order>

class Order {
  id: string;
  size:number;
  price:number;
  type: OrderType;
  timeStamp:number;

  constructor(type:OrderType, size:number, price: number) {
    this.id = v4();
    this.type = type;
    this.size = size;
    this.price = price;
    this.timeStamp = Date.now();
  }

  isBid() {
    return this.type === ORDER_TYPE_BID
  }

  isAsk() {
    return this.type === ORDER_TYPE_ASK
  }
}

// Position will be a group of orders at certain price level
class Position {
  price:number = 0;
  orders:Orders = [];
  amount:number = 0;

  constructor(price:number) {
    this.price = price;
  }

  addOrder(o:Order): Error {
    if(o.price !== this.price) {
      return new Error("POSITION_ORDER_PRICING_INVALID")
    }
    this.orders.push(o);
    this.calculateAmount()
  }

  removeOrder(id:string) {
    _.remove(this.orders, (v: Order) => id == v.id);
    this.calculateAmount()
  }

  calculateAmount() {
    let res:number = 0;
    _.forEach(this.orders, (o:Order) => {
      res += o.size
    });
    this.amount = res 
  }

  hasBidOrders():boolean {
    let res = _.find(this.orders, (o:Order) => {
      return o.isBid()
    })
    return !_.isEmpty(res)
  }

  hasAskOrders(): boolean {
    let res = _.find(this.orders, (o:Order) => {
      return o.isAsk()
    })
    return !_.isEmpty(res)
  }

  getPositionType(): OrderType {
    return this.hasAskOrders() ? ORDER_TYPE_ASK : ORDER_TYPE_BID
  }

}

class OrderBook {
 asks:Positions = [];
 bids:Positions = [];

  getAskPositions() {
    return this.asks;
  }

  getBidPositions() {
    return this.bids;
  }

  getPositionByPrice(incomingPrice:number, orderType:OrderType): Position {
    let positions:Array<Position> = []

    if (orderType === ORDER_TYPE_BID) {
      positions = this.bids
    } else {
      positions = this.asks
    }
    
    let position = _.find(positions, (position:Position) => {
      return position.price === incomingPrice
    });
    if (_.isUndefined(position)) {
      return null
    }
    return position;
  }

  getCloserPosition(incomingPrice:number, orderType:OrderType) {
    let positions:Array<Position> = []

    if (orderType === ORDER_TYPE_BID) {
      positions = this.bids
    } else {
      positions = this.asks
    }

    let currentPositionIndex = _.findIndex(positions, (position:Position) => {
      return position.price === incomingPrice
    });
    return positions[currentPositionIndex+1]
  }

  removeAskPosition(price:number) {
    _.remove(this.asks, (position:Position) => position.price === price)
  }

  removeBidPosition(price:number) {
    _.remove(this.asks, (position:Position) => position.price === price)
  }

  addBidPosition(incomingPosition: Position): Error {
    if(_.isEmpty(incomingPosition.orders)) {
      return new Error("POSITION_ORDERS_CANNOT_BE_EMPTY")
    }
    let bidPosition = this.getPositionByPrice(incomingPosition.price, ORDER_TYPE_BID)
    if (_.isNull(bidPosition)) {
      this.bids.push(incomingPosition);
      return
    }
    _.forEach(incomingPosition.orders, (o:Order) => {
      bidPosition.addOrder(o)
    })
  }

  addAskPosition(incomingPosition: Position): Error {
    if(_.isEmpty(incomingPosition.orders)) {
      return new Error("POSITION_ORDERS_CANNOT_BE_EMPTY")
    }
    let askPosition = this.getPositionByPrice(incomingPosition.price, ORDER_TYPE_ASK)
    if (_.isNull(askPosition)) {
      this.asks.push(incomingPosition);
      return
    }
    _.forEach(incomingPosition.orders, (o:Order) => {
      askPosition.addOrder(o)
    })
  }
}

class Auction {
  orderBook:OrderBook;

  constructor(orderBook:OrderBook) {
    this.orderBook = orderBook
  }

  handleBidOrder(incomingOrder:Order) {
    let counterPartyPosition = this.orderBook.getPositionByPrice(incomingOrder.price, ORDER_TYPE_ASK)
    if (_.isNull(counterPartyPosition)) {
      let createdBidPosition = new Position(incomingOrder.price);
      createdBidPosition.addOrder(incomingOrder)
      this.orderBook.addBidPosition((createdBidPosition))
    } else {
      // Si la posicion tiene el mismo size de la incoming orden significa que la posicion sera completamente fullfilled.
      if (counterPartyPosition.amount === incomingOrder.size) {
        this.orderBook.removeAskPosition(counterPartyPosition.price)
        
      } else if (counterPartyPosition.amount > incomingOrder.size) {

        // Si la posicion tiene mayor size que la incoming orden significa,
        // que hay que revisar las ordenes dentro de esa posicion y tomar ordenes hasta que el size de la incoming order este fullfilled
  
      } else if (counterPartyPosition.amount < incomingOrder.size) {
        // Si la posicion tiene menor amount que la incoming orden significa,
        // que hay que revisar la PROXIMA position mas cercana en price y revisar si se puede hacer fullfill de la incoming order
      }
    }

  }

  handleAskOrder(order:Order) {
    // Fetch for a position with the same price in BID side.
    let counterPartyPosition = this.orderBook.getPositionByPrice(order.price, ORDER_TYPE_BID)
    // Si no existe este price/position en el lado de BID, entonces lo agregamos en el ASK side
    // crear position y agregar en el order book
    if (_.isNull(counterPartyPosition)) {
      let createdAskPosition = new Position(order.price);
      createdAskPosition.addOrder(order)
      this.orderBook.addAskPosition((createdAskPosition))
    }
  }
}

// class Match {
//   AskOrder:Order;
//   BidOrder:Order;
//   FilledAmount:Number;
//   timeStamp:number;
//   constructor(askOrder: Order, bidOrder: Order, amount:number) {
//     this.AskOrder = askOrder;
//     this.BidOrder = bidOrder;
//     this.FilledAmount = amount;
//     this.timeStamp = Date.now();
//   }
// }

// Bids
let bidOrder12k = new Order(ORDER_TYPE_BID, 1, 12000);
let bidOrder13k = new Order(ORDER_TYPE_BID, 1, 13000);

// Aks
let askOrder15k = new Order(ORDER_TYPE_ASK, 1, 15000);
let askOrder10k = new Order(ORDER_TYPE_ASK, 1, 10000);

let auction = new Auction(new OrderBook)

auction.handleBidOrder(bidOrder12k)
auction.handleBidOrder(bidOrder13k)
auction.handleAskOrder(askOrder15k)

// Asks of 10
auction.handleAskOrder(askOrder10k)
auction.handleAskOrder(askOrder10k)
auction.handleAskOrder(askOrder10k)

console.log("Current bids", auction.orderBook.getBidPositions()) 
console.log("Current Asks", auction.orderBook.getAskPositions()) 
// console.log("asks before", auction.orderBook.getAskPositions()) 
// Entra una order de 15k CASE 1
// let bidOrder15k = new Order(ORDER_TYPE_BID, 1, 15000);
// auction.handleBidOrder(bidOrder15k)
// console.log("asks after",auction.orderBook.getAskPositions())

// console.log(auction)



// class Matcher {
//   orderBook:OrderBook;

//   constructor(ob: OrderBook) {
//     this.orderBook = ob;
//   }

  
// }


// function createOrderBook(positions:Array<Position>) {
//   let orderBook = new OrderBook()
//   _.forEach(positions, (p:Position) => {
//     orderBook.addPosition(p);
//   })
//   return orderBook
// }

// let asksPositions = createAsksPositions()
// let bidsPositions = createBidsPositions()
// let positions = []
// let orderBook = createOrderBook(_.concat(positions, asksPositions, bidsPositions))
// console.log(orderBook)



