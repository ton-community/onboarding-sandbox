package types

import (
	"github.com/xssnick/tonutils-go/tvm/cell"
)

type J2JClose struct {
	Side  OrderSide
	Price int

	MasterAddress string
	OrderAddress  string
	JettonAmount  string
}

func (c *J2JClose) ForwardPayload() *cell.Cell {
	return cell.BeginCell().
		MustStoreUInt(uint64(c.Side), 1).
		MustStoreUInt(uint64(c.Price), 32).
		EndCell()
}

type J2TClose struct {
	Coins        string
	OrderAddress string
}

func (c *J2TClose) Payload(query_id uint64) *cell.Cell {
	return cell.BeginCell().
		MustStoreUInt(CloseTonOrder, 32).
		MustStoreUInt(query_id, 64).
		EndCell()
}

type T2JClose struct {
	JettonAmount  string
	OrderAddress  string
	MasterAddress string
}
