import { describe, it, expect, beforeEach } from 'vitest';
import { usePDVStore, CartItem, PaymentEntry } from './pdvStore';

beforeEach(() => {
  localStorage.removeItem('pdv-store');
  usePDVStore.getState().resetPDV();
});

const makeItem = (over: Partial<CartItem> = {}): CartItem => ({
  id: 'p1',
  name: 'Produto',
  price: 100,
  quantity: 1,
  ...over,
});

describe('pdvStore — carrinho', () => {
  it('addToCart adiciona item novo e limpa payments', () => {
    usePDVStore.getState().addPayment({ id: 'pay1', method: 'cash', label: 'Dinheiro', amount: 50 });
    usePDVStore.getState().addToCart(makeItem());
    expect(usePDVStore.getState().cart).toHaveLength(1);
    expect(usePDVStore.getState().payments).toHaveLength(0);
  });

  it('addToCart com item existente incrementa quantity', () => {
    usePDVStore.getState().addToCart(makeItem({ quantity: 2 }));
    usePDVStore.getState().addToCart(makeItem({ quantity: 3 }));
    expect(usePDVStore.getState().cart).toHaveLength(1);
    expect(usePDVStore.getState().cart[0].quantity).toBe(5);
  });

  it('removeFromCart remove e limpa payments', () => {
    usePDVStore.getState().addToCart(makeItem({ id: 'a' }));
    usePDVStore.getState().addToCart(makeItem({ id: 'b' }));
    usePDVStore.getState().removeFromCart('a');
    expect(usePDVStore.getState().cart).toHaveLength(1);
    expect(usePDVStore.getState().cart[0].id).toBe('b');
  });

  it('updateCartQuantity para 0 ou menor remove o item', () => {
    usePDVStore.getState().addToCart(makeItem({ id: 'a' }));
    usePDVStore.getState().updateCartQuantity('a', 0);
    expect(usePDVStore.getState().cart).toHaveLength(0);
  });

  it('updateCartQuantity atualiza para valor positivo', () => {
    usePDVStore.getState().addToCart(makeItem({ id: 'a', quantity: 1 }));
    usePDVStore.getState().updateCartQuantity('a', 7);
    expect(usePDVStore.getState().cart[0].quantity).toBe(7);
  });

  it('updateItemDiscount grava desconto e tipo', () => {
    usePDVStore.getState().addToCart(makeItem({ id: 'a' }));
    usePDVStore.getState().updateItemDiscount('a', 15, 'percent');
    expect(usePDVStore.getState().cart[0].itemDiscount).toBe(15);
    expect(usePDVStore.getState().cart[0].itemDiscountType).toBe('percent');
  });

  it('clearCart zera carrinho e payments', () => {
    usePDVStore.getState().addToCart(makeItem());
    usePDVStore.getState().addPayment({ id: 'p', method: 'cash', label: 'X', amount: 50 });
    usePDVStore.getState().clearCart();
    expect(usePDVStore.getState().cart).toHaveLength(0);
    expect(usePDVStore.getState().payments).toHaveLength(0);
  });
});

describe('pdvStore — cliente e crédito', () => {
  it('setSelectedClient para outro cliente descarta pagamentos credit_balance', () => {
    const cliente1 = { id: 'c1', name: 'Cliente 1', creditBalance: 100 };
    const cliente2 = { id: 'c2', name: 'Cliente 2', creditBalance: 0 };
    usePDVStore.getState().setSelectedClient(cliente1);
    usePDVStore.getState().addPayment({ id: 'p1', method: 'credit_balance', label: 'Saldo', amount: 50 });
    usePDVStore.getState().addPayment({ id: 'p2', method: 'cash', label: 'Dinheiro', amount: 50 });

    usePDVStore.getState().setSelectedClient(cliente2);
    expect(usePDVStore.getState().payments).toHaveLength(1);
    expect(usePDVStore.getState().payments[0].method).toBe('cash');
  });

  it('setSelectedClient com mesmo cliente preserva payments', () => {
    const cliente = { id: 'c1', name: 'Cliente', creditBalance: 100 };
    usePDVStore.getState().setSelectedClient(cliente);
    usePDVStore.getState().addPayment({ id: 'p1', method: 'credit_balance', label: 'Saldo', amount: 50 });
    usePDVStore.getState().setSelectedClient({ ...cliente }); // mesmo id
    expect(usePDVStore.getState().payments).toHaveLength(1);
  });
});

describe('pdvStore — pagamentos', () => {
  it('addPayment/removePayment/clearPayments', () => {
    const p: PaymentEntry = { id: 'p1', method: 'pix', label: 'PIX', amount: 30 };
    usePDVStore.getState().addPayment(p);
    expect(usePDVStore.getState().payments).toHaveLength(1);
    usePDVStore.getState().removePayment('p1');
    expect(usePDVStore.getState().payments).toHaveLength(0);

    usePDVStore.getState().addPayment(p);
    usePDVStore.getState().addPayment({ ...p, id: 'p2' });
    usePDVStore.getState().clearPayments();
    expect(usePDVStore.getState().payments).toHaveLength(0);
  });
});

describe('pdvStore — getters', () => {
  it('getSubtotal soma preços × quantidade considerando itemDiscount em value', () => {
    usePDVStore.getState().addToCart(makeItem({ id: 'a', price: 100, quantity: 2 }));
    usePDVStore.getState().addToCart(makeItem({ id: 'b', price: 50, quantity: 1 }));
    expect(usePDVStore.getState().getSubtotal()).toBe(250);

    usePDVStore.getState().updateItemDiscount('a', 20, 'value');
    expect(usePDVStore.getState().getSubtotal()).toBe(230); // 200-20 + 50
  });

  it('getSubtotal aplica itemDiscount em percent corretamente', () => {
    usePDVStore.getState().addToCart(makeItem({ id: 'a', price: 100, quantity: 2 }));
    usePDVStore.getState().updateItemDiscount('a', 25, 'percent');
    // 200 - 25% = 150
    expect(usePDVStore.getState().getSubtotal()).toBe(150);
  });

  it('getSubtotal nunca devolve negativo (desconto > linha)', () => {
    usePDVStore.getState().addToCart(makeItem({ id: 'a', price: 50, quantity: 1 }));
    usePDVStore.getState().updateItemDiscount('a', 999, 'value');
    expect(usePDVStore.getState().getSubtotal()).toBe(0);
  });

  it('getTotalToPay aplica discount e surcharge em value', () => {
    usePDVStore.getState().addToCart(makeItem({ price: 100, quantity: 2 })); // subtotal 200
    usePDVStore.getState().setDiscount(20);
    usePDVStore.getState().setSurcharge(10);
    expect(usePDVStore.getState().getTotalToPay()).toBe(190); // 200 - 20 + 10
  });

  it('getTotalToPay aplica discount e surcharge em percent', () => {
    usePDVStore.getState().addToCart(makeItem({ price: 100, quantity: 2 })); // 200
    usePDVStore.getState().setDiscount(10);
    usePDVStore.getState().setDiscountType('percent');
    usePDVStore.getState().setSurcharge(5);
    usePDVStore.getState().setSurchargeType('percent');
    // 200 - 10% + 5% = 200 - 20 + 10 = 190
    expect(usePDVStore.getState().getTotalToPay()).toBe(190);
  });

  it('getTotalToPay nunca devolve negativo', () => {
    usePDVStore.getState().addToCart(makeItem({ price: 50, quantity: 1 }));
    usePDVStore.getState().setDiscount(999);
    expect(usePDVStore.getState().getTotalToPay()).toBe(0);
  });

  it('getTotalPaid soma todos os pagamentos', () => {
    usePDVStore.getState().addPayment({ id: 'p1', method: 'cash', label: 'Dinheiro', amount: 50 });
    usePDVStore.getState().addPayment({ id: 'p2', method: 'pix', label: 'PIX', amount: 30.5 });
    expect(usePDVStore.getState().getTotalPaid()).toBe(80.5);
  });
});

describe('pdvStore — invalidação de payments', () => {
  it('mudanças em discount/surcharge zeram payments (forçam refazer)', () => {
    usePDVStore.getState().addToCart(makeItem());
    usePDVStore.getState().addPayment({ id: 'p', method: 'cash', label: 'X', amount: 100 });
    usePDVStore.getState().setDiscount(10);
    expect(usePDVStore.getState().payments).toHaveLength(0);

    usePDVStore.getState().addPayment({ id: 'p', method: 'cash', label: 'X', amount: 100 });
    usePDVStore.getState().setSurcharge(5);
    expect(usePDVStore.getState().payments).toHaveLength(0);
  });
});

describe('pdvStore — resetPDV', () => {
  it('resetPDV zera tudo exceto preferências persistentes', () => {
    usePDVStore.getState().addToCart(makeItem());
    usePDVStore.getState().setSelectedClient({ id: 'c1', name: 'X' });
    usePDVStore.getState().setDiscount(10);
    usePDVStore.getState().addPayment({ id: 'p', method: 'cash', label: 'X', amount: 50 });
    usePDVStore.getState().setLastSaleId(42); // lastSaleId NÃO é zerado em resetPDV

    usePDVStore.getState().resetPDV();
    const s = usePDVStore.getState();
    expect(s.cart).toHaveLength(0);
    expect(s.selectedClient).toBeNull();
    expect(s.discount).toBe(0);
    expect(s.payments).toHaveLength(0);
    expect(s.saleType).toBe('inperson');
    expect(s.lastSaleId).toBe(42); // mantém — usado para reimprimir
  });
});
