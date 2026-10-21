// Package inventory is the sequential Go reference example shown by Invariant Lab.
package inventory

import "errors"

var (
	ErrInvalidQuantity   = errors.New("invalid quantity")
	ErrInsufficientStock = errors.New("insufficient stock")
)

type Inventory interface {
	Reserve(qty int) error
	Available() int
}

type Stock struct{ available int }

func NewStock(available int) *Stock {
	if available < 0 {
		panic("initial stock must be nonnegative")
	}
	return &Stock{available: available}
}

func (s *Stock) Available() int { return s.available }

func (s *Stock) Reserve(qty int) error {
	if qty <= 0 {
		return ErrInvalidQuantity
	}
	if qty > s.available {
		return ErrInsufficientStock
	}
	s.available -= qty
	return nil
}

var _ Inventory = (*Stock)(nil)
