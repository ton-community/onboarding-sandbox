package types

import (
	"time"

	"github.com/xssnick/tonutils-go/address"
	"github.com/xssnick/tonutils-go/tlb"
	"github.com/xssnick/tonutils-go/tvm/cell"
)

type OrderSide = int8

const (
	Sell OrderSide = 0
	Buy  OrderSide = 1
)

type J2JOrder struct {
	BaseMasterAddress  string
	QuoteMasterAddress string
	JettonAmount       string
	Side               OrderSide
	Price              int
}

func (o *J2JOrder) ForwardPayload() *cell.Cell {
	return cell.BeginCell().
		MustStoreUInt(CreateOrder, 32).
		MustStoreAddr(address.MustParseAddr(o.BaseMasterAddress)).
		MustStoreAddr(address.MustParseAddr(o.QuoteMasterAddress)).
		MustStoreUInt(uint64(o.Side), 1).
		MustStoreUInt(uint64(o.Price), 32).
		MustStoreUInt(uint64(time.Now().UTC().Unix()+1000), 64).
		EndCell()
}

// create ton order by jetton
type J2TOrder struct {
	MasterAddress string
	JettonAmount  string
	Price         int
}

func (o *J2TOrder) ForwardPayload() *cell.Cell {
	return cell.BeginCell().
		MustStoreUInt(CreateTonOrderByJetton, 32).
		MustStoreAddr(address.MustParseAddr(o.MasterAddress)).
		MustStoreUInt(uint64(o.Price), 32).
		MustStoreUInt(uint64(time.Now().UTC().Unix()+1000), 64).
		EndCell()
}

// create ton order by toncoin
type T2JOrder struct {
	MasterAddress string
	Amount        string
	Price         int
}

func (o *T2JOrder) Payload(query_id uint64) *cell.Cell {
	return cell.BeginCell().
		MustStoreUInt(CreateTonOrderByTon, 32).
		MustStoreUInt(query_id, 64).
		MustStoreAddr(address.MustParseAddr(o.MasterAddress)).
		MustStoreBigCoins(tlb.MustFromTON(o.Amount).Nano()).
		MustStoreUInt(uint64(o.Price), 32).
		MustStoreUInt(uint64(time.Now().UTC().Unix()+1000), 64).
		EndCell()
}
