export type Participant = {
  id: string;
  name: string;
  avatarSeed?: string;
};

export type PaymentProfile = {
  bankId: string;
  accountNo: string;
  accountName: string;
};

export type ExpenseCategoryId =
  | "food"
  | "transport"
  | "lodging"
  | "shopping"
  | "entertainment"
  | "other";

export type Expense = {
  id: string;
  title: string;
  amount: number;
  categoryId?: ExpenseCategoryId;
  payerId: string;
  splitParticipantIds: string[];
  createdAt: string;
};

export type Receipt = {
  id: string;
  participantId: string;
  amount: number;
  createdAt: string;
};

export type Game = {
  id: string;
  code: string;
  name: string;
  paymentProfile?: PaymentProfile;
  participants: Participant[];
  expenses: Expense[];
  receipts?: Receipt[];
  shareToken: string;
  createdAt: string;
};

export type ParticipantBalance = {
  participant: Participant;
  paid: number;
  owed: number;
  balance: number;
};

export type Settlement = {
  from: Participant;
  to: Participant;
  amount: number;
};
