export type IncomingTransfer = {
  id: string;
  accountNo: string;
  amount: number;
  content: string;
};

export type BankFeed = {
  listAccountNumbers(): Promise<string[]>;
  listIncomingSince(sinceIso: string): Promise<IncomingTransfer[]>;
};
