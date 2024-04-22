package main

import (
	"context"
	"log"
	"strings"
	"ton/config"
	"ton/exchange"
	"ton/exchange/types"

	"github.com/xssnick/tonutils-go/liteclient"
	"github.com/xssnick/tonutils-go/ton"
	"github.com/xssnick/tonutils-go/ton/wallet"
)

const (
	baseMasterAddress  = "kQBWwN8SW6Rc_wHl3hnXYLTCWKPk3-VWtuhib3KMg0Wsqdbl" // VUP
	quoteMasterAddress = "kQCXIMgabnmqaEUspkO0XlSPS4t394YFBlIg0Upygyw3fuSL" // LUP
)

func createJ2JOrder(exch *exchange.Exchange, side types.OrderSide) {
	var order types.J2JOrder
	order.BaseMasterAddress = baseMasterAddress
	order.QuoteMasterAddress = quoteMasterAddress
	order.Side = side
	order.Price = 1
	order.JettonAmount = "1"

	err := exch.CreateJ2JOrder(&order)
	if err != nil {
		log.Fatal(err)
	}
}

func closeJ2JOrder(exch *exchange.Exchange, side types.OrderSide) {
	var close types.J2JClose

	switch side {
	case types.Buy:
		close.MasterAddress = quoteMasterAddress
	case types.Sell:
		close.MasterAddress = baseMasterAddress
	default:
		log.Fatal("wrong order side: ", side)
	}

	close.Side = side
	close.Price = 1
	close.JettonAmount = "1"
	close.OrderAddress = "kQA4fvqAhxmfW_dcgrjXkIZ5IUCpEB871qNoMZcM-_0BGO0I"

	err := exch.CloseJ2JOrder(&close)
	if err != nil {
		log.Fatal(err)
	}
}

// (base/quoat) = (jetton/toncoin)
func createTonOrder(exch *exchange.Exchange, side types.OrderSide) {
	if side == types.Sell {
		var j2tOrder types.J2TOrder
		j2tOrder.JettonAmount = "1.0"
		j2tOrder.MasterAddress = baseMasterAddress
		j2tOrder.Price = 1

		err := exch.CreateJ2TOrder(&j2tOrder)
		if err != nil {
			log.Fatal(err)
		}
		return
	}

	if side == types.Buy {
		var order types.T2JOrder
		order.Amount = "0.5"
		order.MasterAddress = baseMasterAddress
		order.Price = 1

		err := exch.CreateT2JOrder(&order)
		if err != nil {
			log.Fatal(err)
		}
		return
	}
}

// (base/quoat) = (jetton/toncoin)
func closeTonOrder(exch *exchange.Exchange, side types.OrderSide) {
	if side == types.Buy {
		var j2tClose types.J2TClose
		j2tClose.Coins = "0.3"
		j2tClose.OrderAddress = "kQAhznpsLUTSc8oRs7Uy1P_QXNWuLnPwoAgDb8OUpgoXv6py"
		err := exch.CloseJ2TOrder(&j2tClose)
		if err != nil {
			log.Fatal(err)
		}
		return
	}

	if side == types.Sell {
		var close types.T2JClose
		close.MasterAddress = baseMasterAddress
		close.OrderAddress = "kQDNqpY6YfoS88RobJoNfMMFiSSBRtu0Rf56LbkzgSN5P4Bm"
		close.JettonAmount = "0.5"

		err := exch.CloseT2JOrder(&close)
		if err != nil {
			log.Fatal(err)
		}
	}
}

func main() {
	client := liteclient.NewConnectionPool()

	err := client.AddConnectionsFromConfigUrl(context.Background(), config.Testnet)
	if err != nil {
		panic(err)
	}

	ctx := client.StickyContext(context.Background())

	api := ton.NewAPIClient(client)

	words := strings.Split(config.Seedphrase, " ")

	if len(words) != 24 {
		log.Fatal("words: ", len(words))
	}

	v4Wallet, err := wallet.FromSeed(api, words, wallet.V4R2)
	if err != nil {
		log.Fatal("FromSeed err: ", err.Error())
	}

	exch := exchange.NewExchange(v4Wallet, api, ctx, config.DeployerAddress)

	createJ2JOrder(exch, types.Sell)
	closeJ2JOrder(exch, types.Buy)

	// try to sell Jetton for Toncoin
	createTonOrder(exch, types.Sell)
	closeTonOrder(exch, types.Buy)

	// try to buy Jetton for Toncoin
	createTonOrder(exch, types.Buy)
	closeTonOrder(exch, types.Sell)
}
