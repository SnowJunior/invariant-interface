package inventory

import "testing"

func TestSafeContract(t *testing.T) {
	cases := []struct {
		name                  string
		stock, qty, wantStock int
		wantErr               error
	}{
		{"partial", 5, 2, 3, nil},
		{"exact depletion", 5, 5, 0, nil},
		{"one item", 1, 1, 0, nil},
		{"zero", 5, 0, 5, ErrInvalidQuantity},
		{"negative", 5, -2, 5, ErrInvalidQuantity},
		{"oversize", 5, 8, 5, ErrInsufficientStock},
		{"empty", 0, 1, 0, ErrInsufficientStock},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			s := NewStock(c.stock)
			if err := s.Reserve(c.qty); err != c.wantErr {
				t.Fatalf("error = %v, want %v", err, c.wantErr)
			}
			if got := s.Available(); got != c.wantStock {
				t.Fatalf("stock = %d, want %d", got, c.wantStock)
			}
		})
	}
}

// Deliberately faulty implementations are kept in test code. All satisfy Inventory.
type unchecked struct{ available int }

func (s *unchecked) Available() int        { return s.available }
func (s *unchecked) Reserve(qty int) error { s.available -= qty; return nil }

type mutates struct{ available int }

func (s *mutates) Available() int { return s.available }
func (s *mutates) Reserve(qty int) error {
	if qty <= 0 {
		return ErrInvalidQuantity
	}
	s.available -= qty
	if s.available < 0 {
		return ErrInsufficientStock
	}
	return nil
}

type offbyone struct{ available int }

func (s *offbyone) Available() int { return s.available }
func (s *offbyone) Reserve(qty int) error {
	if qty <= 0 {
		return ErrInvalidQuantity
	}
	if qty > s.available {
		return ErrInsufficientStock
	}
	s.available -= qty - 1
	return nil
}

type rejectall struct{ available int }

func (s *rejectall) Available() int { return s.available }
func (s *rejectall) Reserve(qty int) error {
	if qty <= 0 {
		return ErrInvalidQuantity
	}
	return ErrInsufficientStock
}

var (
	_ Inventory = (*unchecked)(nil)
	_ Inventory = (*mutates)(nil)
	_ Inventory = (*offbyone)(nil)
	_ Inventory = (*rejectall)(nil)
)

func TestFaultsSatisfyInterfaceButBreakBehavior(t *testing.T) {
	t.Run("unchecked oversells", func(t *testing.T) {
		var s Inventory = &unchecked{5}
		if err := s.Reserve(8); err != nil {
			t.Fatalf("demonstration changed: %v", err)
		}
		if s.Available() != -3 {
			t.Fatalf("expected demonstrated negative stock, got %d", s.Available())
		}
	})
	t.Run("unchecked creates stock", func(t *testing.T) {
		var s Inventory = &unchecked{5}
		if err := s.Reserve(-2); err != nil {
			t.Fatal(err)
		}
		if s.Available() != 7 {
			t.Fatalf("expected demonstrated invented stock, got %d", s.Available())
		}
	})
	t.Run("error after mutation", func(t *testing.T) {
		var s Inventory = &mutates{5}
		if err := s.Reserve(8); err != ErrInsufficientStock {
			t.Fatalf("error = %v", err)
		}
		if s.Available() != -3 {
			t.Fatalf("expected failed call to expose mutation, got %d", s.Available())
		}
	})
	t.Run("wrong successful decrement", func(t *testing.T) {
		var s Inventory = &offbyone{5}
		if err := s.Reserve(2); err != nil {
			t.Fatal(err)
		}
		if s.Available() != 4 {
			t.Fatalf("expected off-by-one fault, got %d", s.Available())
		}
	})
	t.Run("rejecting every request is incorrect", func(t *testing.T) {
		var s Inventory = &rejectall{5}
		if err := s.Reserve(2); err != ErrInsufficientStock {
			t.Fatalf("expected incorrect rejection, got %v", err)
		}
		if s.Available() != 5 {
			t.Fatalf("unexpected mutation: %d", s.Available())
		}
	})
}

func TestRejectNegativeInitialStock(t *testing.T) {
	defer func() {
		if recover() == nil {
			t.Fatal("negative initialization must not be accepted")
		}
	}()
	NewStock(-1)
}
