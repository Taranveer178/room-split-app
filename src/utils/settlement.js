export const GROUP_DELETE_BALANCE_TOLERANCE = 1;

export const calculateSettlements = (expenses, members) => {
  const balances = {};
  members.forEach((memberId) => { balances[memberId] = 0; });

  expenses.forEach((expense) => {
    const totalAmount = parseFloat(expense.totalAmount);
    if (balances[expense.paidBy] !== undefined) balances[expense.paidBy] += totalAmount;
    Object.entries(expense.splits || {}).forEach(([userId, amount]) => {
      if (balances[userId] !== undefined) balances[userId] -= parseFloat(amount);
    });
  });

  Object.keys(balances).forEach((userId) => {
    balances[userId] = Math.round(balances[userId] * 100) / 100;
  });

  const debtors = [];
  const creditors = [];
  Object.entries(balances).forEach(([userId, amount]) => {
    if (amount < -0.01) debtors.push({ userId, amount });
    else if (amount > 0.01) creditors.push({ userId, amount });
  });
  debtors.sort((first, second) => first.amount - second.amount);
  creditors.sort((first, second) => second.amount - first.amount);

  const settlements = [];
  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountToSettle = Math.min(Math.abs(debtor.amount), creditor.amount);
    if (amountToSettle > 0.01) {
      settlements.push({ from: debtor.userId, to: creditor.userId, amount: amountToSettle });
    }
    debtor.amount += amountToSettle;
    creditor.amount -= amountToSettle;
    if (Math.abs(debtor.amount) < 0.01) debtor.amount = 0;
    if (Math.abs(creditor.amount) < 0.01) creditor.amount = 0;
    if (debtor.amount === 0) debtorIndex += 1;
    if (creditor.amount === 0) creditorIndex += 1;
  }

  return { balances, settlements };
};