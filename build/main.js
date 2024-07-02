"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const _ = require("lodash");
const ORDER_TYPE_BID = "BID";
const ORDER_TYPE_ASK = "ASK";
class Order {
    constructor(type, size, price) {
        this.id = (0, uuid_1.v4)();
        this.type = type;
        this.size = size;
        this.price = price;
        this.timeStamp = Date.now();
    }
    isBid() {
        return this.type === ORDER_TYPE_BID;
    }
    isAsk() {
        return this.type === ORDER_TYPE_ASK;
    }
}
// Position will be a group of orders at certain price level
class Position {
    constructor(price) {
        this.price = 0;
        this.orders = [];
        this.amount = 0;
        this.price = price;
    }
    addOrder(o) {
        if (o.price !== this.price) {
            return new Error("POSITION_ORDER_PRICING_INVALID");
        }
        this.orders.push(o);
        this.calculateAmount();
    }
    removeOrder(id) {
        _.remove(this.orders, (v) => id == v.id);
        this.calculateAmount();
    }
    calculateAmount() {
        let res = 0;
        _.forEach(this.orders, (o) => {
            res += o.size;
        });
        this.amount = res;
    }
    hasBidOrders() {
        let res = _.find(this.orders, (o) => {
            return o.isBid();
        });
        return !_.isEmpty(res);
    }
    hasAskOrders() {
        let res = _.find(this.orders, (o) => {
            return o.isAsk();
        });
        return !_.isEmpty(res);
    }
    getPositionType() {
        return this.hasAskOrders() ? ORDER_TYPE_ASK : ORDER_TYPE_BID;
    }
}
class OrderBook {
    constructor() {
        this.asks = [];
        this.bids = [];
    }
    getAskPositions() {
        return this.asks;
    }
    getBidPositions() {
        return this.bids;
    }
    getPositionByPrice(incomingPrice, orderType) {
        let positions = [];
        if (orderType === ORDER_TYPE_BID) {
            positions = this.bids;
        }
        else {
            positions = this.asks;
        }
        let position = _.find(positions, (position) => {
            return position.price === incomingPrice;
        });
        if (_.isUndefined(position)) {
            return null;
        }
        return position;
    }
    getCloserPosition(incomingPrice, orderType) {
        let positions = [];
        if (orderType === ORDER_TYPE_BID) {
            positions = this.bids;
        }
        else {
            positions = this.asks;
        }
        let currentPositionIndex = _.findIndex(positions, (position) => {
            return position.price === incomingPrice;
        });
        return positions[currentPositionIndex + 1];
    }
    removeAskPosition(price) {
        _.remove(this.asks, (position) => position.price === price);
    }
    removeBidPosition(price) {
        _.remove(this.asks, (position) => position.price === price);
    }
    addBidPosition(incomingPosition) {
        if (_.isEmpty(incomingPosition.orders)) {
            return new Error("POSITION_ORDERS_CANNOT_BE_EMPTY");
        }
        let bidPosition = this.getPositionByPrice(incomingPosition.price, ORDER_TYPE_BID);
        if (_.isNull(bidPosition)) {
            this.bids.push(incomingPosition);
            return;
        }
        _.forEach(incomingPosition.orders, (o) => {
            bidPosition.addOrder(o);
        });
    }
    addAskPosition(incomingPosition) {
        if (_.isEmpty(incomingPosition.orders)) {
            return new Error("POSITION_ORDERS_CANNOT_BE_EMPTY");
        }
        let askPosition = this.getPositionByPrice(incomingPosition.price, ORDER_TYPE_ASK);
        if (_.isNull(askPosition)) {
            this.asks.push(incomingPosition);
            return;
        }
        _.forEach(incomingPosition.orders, (o) => {
            askPosition.addOrder(o);
        });
    }
}
class Auction {
    constructor(orderBook) {
        this.orderBook = orderBook;
    }
    handleBidOrder(incomingOrder) {
        let counterPartyPosition = this.orderBook.getPositionByPrice(incomingOrder.price, ORDER_TYPE_ASK);
        if (_.isNull(counterPartyPosition)) {
            let createdBidPosition = new Position(incomingOrder.price);
            createdBidPosition.addOrder(incomingOrder);
            this.orderBook.addBidPosition((createdBidPosition));
        }
        else {
            // Si la posicion tiene el mismo size de la incoming orden significa que la posicion sera completamente fullfilled.
            if (counterPartyPosition.amount === incomingOrder.size) {
                this.orderBook.removeAskPosition(counterPartyPosition.price);
            }
            else if (counterPartyPosition.amount > incomingOrder.size) {
                // Si la posicion tiene mayor size que la incoming orden significa,
                // que hay que revisar las ordenes dentro de esa posicion y tomar ordenes hasta que el size de la incoming order este fullfilled
            }
            else if (counterPartyPosition.amount < incomingOrder.size) {
                // Si la posicion tiene menor amount que la incoming orden significa,
                // que hay que revisar la PROXIMA position mas cercana en price y revisar si se puede hacer fullfill de la incoming order
            }
        }
    }
    handleAskOrder(order) {
        // Fetch for a position with the same price in BID side.
        let counterPartyPosition = this.orderBook.getPositionByPrice(order.price, ORDER_TYPE_BID);
        // Si no existe este price/position en el lado de BID, entonces lo agregamos en el ASK side
        // crear position y agregar en el order book
        if (_.isNull(counterPartyPosition)) {
            let createdAskPosition = new Position(order.price);
            createdAskPosition.addOrder(order);
            this.orderBook.addAskPosition((createdAskPosition));
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
let auction = new Auction(new OrderBook);
auction.handleBidOrder(bidOrder12k);
auction.handleBidOrder(bidOrder13k);
auction.handleAskOrder(askOrder15k);
// Asks of 10
auction.handleAskOrder(askOrder10k);
auction.handleAskOrder(askOrder10k);
auction.handleAskOrder(askOrder10k);
console.log("Current bids", auction.orderBook.getBidPositions());
console.log("Current Asks", auction.orderBook.getAskPositions());
//# sourceMappingURL=main.js.map