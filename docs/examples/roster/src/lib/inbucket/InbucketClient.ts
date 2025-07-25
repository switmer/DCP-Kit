type InbucketMessageListing = {
  mailbox: string;
  id: string;
  from: string;
  to: string[];
  subject: string;
  date: string;
  posixMillis: number;
  size: number;
  seen: boolean;
};

type InbucketMessage = InbucketMessageListing & {
  body: {
    text: string;
    html: string;
  };
  header: Record<string, string[]>;
};

export class InbucketClient {
  constructor(private readonly baseUrl = 'http://localhost:54324/api/v1') {}

  protected async request(path: string, options: RequestInit = {}) {
    const response = await fetch(this.baseUrl + path, options);
    return await response.json();
  }

  /**
   * @param email The email address of the user to get messages for
   */
  async getMessagesForUser(email: string): Promise<InbucketMessageListing[]> {
    const [user] = email.split('@');
    const messages = await this.getMailboxMessages(user);

    return messages.filter((m) => m.to.some((to) => to.includes(`<${email}>`)));
  }

  /**
   * @param mailbox A user like "bob" out of "bob@example.com"
   */
  async getMailboxMessages(mailbox: string): Promise<InbucketMessageListing[]> {
    return this.request(`/mailbox/${mailbox}`);
  }

  async getMessage(mailbox: string, id: string): Promise<InbucketMessage> {
    return this.request(`/mailbox/${mailbox}/${id}`);
  }

  async getNewestMessageForUser(email: string): Promise<InbucketMessage | null> {
    const messages = await this.getMessagesForUser(email);
    if (messages.length === 0) {
      return null;
    }

    // Sort by the date field, descending
    messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestMessageListing = messages[0];

    return this.getMessage(latestMessageListing.mailbox, latestMessageListing.id);
  }
}
