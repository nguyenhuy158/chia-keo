export type Participant = {
  id: string;
  name: string;
  bankId: string;
  accountNo: string;
  accountName: string;
};

export type Expense = {
  id: string;
  title: string;
  amount: number;
  payerId: string;
  splitParticipantIds: string[];
  createdAt: string;
};

export type Game = {
  id: string;
  code: string;
  name: string;
  participants: Participant[];
  expenses: Expense[];
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
