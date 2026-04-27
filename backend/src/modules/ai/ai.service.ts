import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGroq } from '@langchain/groq';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import {
  RunnableSequence,
  RunnablePassthrough,
} from '@langchain/core/runnables';
import { MessageHistoryService } from '../message-history/message-history.service';
import { ConversationsService } from '../conversations/conversations.service';
import { UsersService } from '../users/users.service';
import { ExpensesService } from '../expenses/expenses.service';
import { BudgetsService } from '../budgets/budgets.service';
import { SavingsGoalsService } from '../savings_goals/savings_goals.service';
import { ConnectionsService } from '../connections/connections.service';
import { CategoriesService } from '../categories/categories.service';

interface KnowledgeDocument {
  content: string;
  metadata: { topic: string; type: string };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private llm: ChatGroq;
  private knowledgeBase: KnowledgeDocument[] = [];
  private readonly plainTextAi: boolean;

  constructor(
    private readonly messageHistoryService: MessageHistoryService,
    private readonly conversationsService: ConversationsService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly expensesService: ExpensesService,
    private readonly budgetsService: BudgetsService,
    private readonly savingsGoalsService: SavingsGoalsService,
    private readonly connectionsService: ConnectionsService,
    private readonly categoriesService: CategoriesService,
  ) {
    // Using Groq (FREE LLM - Get key from https://console.groq.com)
    const apiKey = this.configService.get<string>('GROQ_API_KEY');

    if (!apiKey || apiKey === 'dummy-key') {
      this.logger.warn(
        '⚠️  GROQ_API_KEY not found in environment variables. AI features will use fallback responses.',
      );
      this.logger.warn(
        '   Get your FREE API key from https://console.groq.com',
      );
    } else {
      this.logger.log(
        `✅ Groq API key configured (${apiKey.substring(0, 10)}...)`,
      );
    }

    this.llm = new ChatGroq({
      apiKey: apiKey || 'dummy-key',
      model: 'llama-3.3-70b-versatile', // Free and fast model (updated Jan 2026)
      temperature: 0.7,
      maxTokens: 500,
    });

    this.plainTextAi =
      (this.configService.get<string>('AI_PLAIN_TEXT') ?? 'true').toLowerCase() !==
      'false';

    this.initializeKnowledgeBase();
  }

  private formatAiResponse(text: string): string {
    if (!this.plainTextAi) return text;

    let out = text;

    // Remove code fences but keep inner content
    out = out.replace(/```[\s\S]*?\n([\s\S]*?)```/g, '$1');

    // Remove inline code ticks
    out = out.replace(/`([^`]+)`/g, '$1');

    // Remove emphasis markers (**bold**, __bold__, *italics*, _italics_)
    out = out.replace(/\*\*([^*]+)\*\*/g, '$1');
    out = out.replace(/__([^_]+)__/g, '$1');
    out = out.replace(/\*([^*\n]+)\*/g, '$1');
    out = out.replace(/_([^_\n]+)_/g, '$1');

    // Convert markdown links [text](url) -> text
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');

    // Headings -> plain line
    out = out.replace(/^\s{0,3}#{1,6}\s+/gm, '');

    // Blockquotes -> plain line
    out = out.replace(/^\s{0,3}>\s?/gm, '');

    // Normalize bullets (keep as "- ")
    out = out.replace(/^\s*•\s+/gm, '- ');
    out = out.replace(/^\s*\*\s+/gm, '- ');

    // Remove obvious emoji-only decoration at line start (keeps the text)
    out = out.replace(/^\s*[✅❌📊💸🎯👋📨🚀]+\s*/gm, '');

    // Collapse excessive blank lines
    out = out.replace(/\n{3,}/g, '\n\n');

    return out.trim();
  }

  private initializeKnowledgeBase() {
    // Initialize knowledge base with financial information (RAG)
    this.knowledgeBase = this.getFinancialKnowledgeBase();
    this.logger.log(
      `✅ RAG Knowledge base initialized with ${this.knowledgeBase.length} documents`,
    );
  }

  private getFinancialKnowledgeBase(): KnowledgeDocument[] {
    // Financial tips and app information for RAG
    const knowledge = [
      {
        content: `Budget Management in SpendSense:
To create a budget, navigate to the Budgets page and click "New Budget". 
You can set budgets by category (Food, Transport, Entertainment, etc.).
Set a monthly or weekly amount, and the app will track your spending automatically.
When you reach 80% of your budget, you'll get a notification.
Best practice: Review budgets monthly and adjust based on actual spending.`,
        metadata: { topic: 'budgets', type: 'guide' },
      },
      {
        content: `Expense Tracking Best Practices:
1. Log expenses immediately after making them
2. Always categorize expenses correctly for better insights
3. Add notes for clarity on larger purchases
4. Review your expenses weekly to stay aware
5. Use the expense analytics to identify spending patterns
6. Set up recurring expenses for bills and subscriptions
7. Take photos of receipts for record keeping`,
        metadata: { topic: 'expenses', type: 'tips' },
      },
      {
        content: `Savings Goals Strategy:
The 50/30/20 rule: 50% needs, 30% wants, 20% savings.
Create specific goals with deadlines (e.g., "Emergency Fund $10,000 by Dec 2026").
Set up automatic transfers on payday to reach goals faster.
Track progress monthly and adjust contributions as needed.
Emergency fund should cover 3-6 months of expenses.
Start small if needed - even $25/month adds up over time.`,
        metadata: { topic: 'savings', type: 'strategy' },
      },
      {
        content: `Bill Splitting Feature:
SpendSense allows you to split bills with friends and roommates easily.
Add a bill, specify the total amount, and select participants.
Choose split method: equal, percentage, or custom amounts.
Participants get notifications and can mark when they've paid.
Perfect for shared rent, utilities, group dinners, or trips.
Track who owes what with automatic calculations.`,
        metadata: { topic: 'bills', type: 'feature' },
      },
      {
        content: `Financial Reports and Analytics:
View detailed reports showing:
- Spending by category with pie charts
- Trends over time with line graphs
- Budget vs actual comparison bars
- Month-over-month percentage changes
- Top spending categories and unusual expenses
- Income vs expenses overview
Export reports as PDF for tax records or personal review.`,
        metadata: { topic: 'reports', type: 'feature' },
      },
      {
        content: `Money Saving Tips and Tricks:
1. Track every expense for at least a month to understand patterns
2. Identify and cancel subscription services you don't use
3. Cook meals at home - eating out costs 3x more
4. Use the envelope budgeting method for discretionary spending
5. Set up automatic savings transfers on payday
6. Review and negotiate recurring bills annually
7. Use cash for discretionary spending to limit overspending
8. Wait 24 hours before making non-essential purchases
9. Buy generic brands for common items
10. Use cashback and rewards programs strategically`,
        metadata: { topic: 'savings', type: 'tips' },
      },
      {
        content: `Collaboration Features in SpendSense:
Connect with family and friends to:
- Share expense tracking for joint accounts
- Split bills automatically with roommates
- Set shared savings goals (vacation fund, gift fund)
- Get group spending insights and reports
- Send payment reminders automatically
Send connection requests in the Connections page by email or username.
Perfect for couples, roommates, or family budgeting.`,
        metadata: { topic: 'connections', type: 'feature' },
      },
      {
        content: `Notifications and Alerts:
SpendSense sends smart notifications for:
- Budget limit warnings (at 80% and 100%)
- Bill due date reminders
- Unusual spending patterns detected
- Savings goal milestones reached
- Payment requests from connections
- Monthly financial summaries
Customize notification preferences in Settings.`,
        metadata: { topic: 'notifications', type: 'feature' },
      },
    ];

    return knowledge;
  }

  private simpleSearch(query: string, topK: number = 3): KnowledgeDocument[] {
    // Simple keyword-based search (RAG retrieval)
    const lowerQuery = query.toLowerCase();
    const scored = this.knowledgeBase.map((doc) => {
      const lowerContent = doc.content.toLowerCase();
      let score = 0;

      // Count keyword matches
      const keywords = lowerQuery.split(' ').filter((w) => w.length > 3);
      keywords.forEach((keyword) => {
        const matches = (lowerContent.match(new RegExp(keyword, 'g')) || [])
          .length;
        score += matches;
      });

      return { doc, score };
    });

    // Sort by score and return top K
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((item) => item.doc);
  }

  // RAG-powered chat
  async chat(
    userId: string,
    message: string,
    conversationHistory?: Array<{ role: string; content: string }>,
  ) {
    try {
      // Use RAG to find relevant context from knowledge base
      const relevantDocs = this.simpleSearch(message, 3);
      const context =
        relevantDocs.length > 0
          ? relevantDocs.map((doc) => doc.content).join('\n\n')
          : 'No specific context found.';

      this.logger.log(`RAG found ${relevantDocs.length} relevant documents`);

      // Build conversation history for context
      const historyContext =
        conversationHistory && conversationHistory.length > 0
          ? `\n\nRecent conversation history:\n${conversationHistory
              .map((msg) => `${msg.role}: ${msg.content}`)
              .join('\n')}`
          : '';

      // Build the prompt with conversation history
      const fullPrompt = `You are a helpful AI financial assistant for SpendSense, a personal finance management app.

Use the following context from the knowledge base to answer the user's question:

${context}${historyContext}

If the context doesn't contain enough information, use your general knowledge about personal finance.
Be friendly, concise, and provide actionable advice.
Return plain text. Do not use Markdown (no **, # headings, or code fences). Use simple hyphen bullets when listing items.
Remember the conversation context and refer back to it when relevant.

User: ${message}`;

      const response = await this.llm.invoke(fullPrompt);

      // Extract text from response
      if (typeof response === 'string') {
        return this.formatAiResponse(response);
      } else if (response.content) {
        if (Array.isArray(response.content)) {
          return this.formatAiResponse(
            response.content
            .map((block: any) =>
              typeof block === 'string' ? block : block.text || '',
            )
            .join(''),
          );
        }
        return this.formatAiResponse(String(response.content));
      }
      return this.formatAiResponse(String(response));
    } catch (error: any) {
      this.logger.error(`❌ AI chat error: ${error.message}`);
      this.logger.error(`Error details: ${JSON.stringify(error, null, 2)}`);
      this.logger.warn(
        'Falling back to default response. Check your GROQ_API_KEY configuration.',
      );
      return this.formatAiResponse(this.getFallbackResponse(message));
    }
  }

  async sendMessageToUser(
    senderId: string,
    targetUserId: string,
    message: string,
    reason?: string,
  ) {
    try {
      // First, check if sender has any existing conversation with the target
      const senderConversations =
        await this.conversationsService.getActiveConversationsForUser(senderId);
      let conversation = senderConversations.find((conv) =>
        conv.participants.some((p) => p.id === targetUserId),
      );

      if (conversation) {
        // Use existing conversation
        await this.messageHistoryService.createMessage(senderId, {
          conversation_id: conversation.id,
          content: message,
        });

        this.logger.log(
          `Message sent to user ${targetUserId} using existing conversation. Reason: ${reason}`,
        );
        return { success: true, conversationId: conversation.id };
      }

      // No existing conversation - check if users are connected
      const areConnected = await this.connectionsService.areUsersConnected(
        senderId,
        targetUserId,
      );

      if (!areConnected) {
        throw new Error(
          `You're not connected with this user. Send them a connection request first from the Connections page!`,
        );
      }

      // Users are connected, create new conversation
      const {
        ConversationType,
      } = require('../conversations/conversations.entity');
      conversation = await this.conversationsService.createConversation(
        senderId,
        {
          name: 'Direct Message',
          type: ConversationType.Direct,
          participant_ids: [targetUserId],
        },
      );

      // Send message
      await this.messageHistoryService.createMessage(senderId, {
        conversation_id: conversation.id,
        content: message,
      });

      this.logger.log(
        `Created conversation and sent message to user ${targetUserId}. Reason: ${reason}`,
      );
      return { success: true, conversationId: conversation.id };
    } catch (error: any) {
      this.logger.error(`Failed to send message: ${error.message}`);
      throw error;
    }
  }

  async analyzeFinancialData(userId: string, data: any) {
    try {
      // Add user's financial data to RAG temporarily
      if (data) {
        this.knowledgeBase.push({
          content: `User Financial Data: ${JSON.stringify(data, null, 2)}`,
          metadata: { topic: 'user_data', type: userId },
        });
      }

      const prompt = `Analyze this financial data and provide actionable insights:

${JSON.stringify(data, null, 2)}

Provide:
1. Key spending patterns you notice
2. Specific budget recommendations
3. Concrete savings opportunities
4. Any warnings about overspending

Keep it concise and actionable with specific numbers when possible.`;

      const analysis = await this.chat(userId, prompt);
      return analysis;
    } catch (error: any) {
      this.logger.error(`Financial analysis error: ${error.message}`);
      return 'Unable to analyze financial data at this time. Please ensure your Groq API key is set.';
    }
  }

  // Add user-specific data to RAG for personalized responses
  async addUserDataToRAG(userId: string, dataType: string, data: any) {
    try {
      // Add to knowledge base
      this.knowledgeBase.push({
        content: `${dataType}: ${JSON.stringify(data, null, 2)}`,
        metadata: { topic: dataType, type: userId },
      });
      this.logger.log(`Added ${dataType} to RAG for user ${userId}`);
    } catch (error: any) {
      this.logger.error(`Failed to add data to RAG: ${error.message}`);
    }
  }

  // Generate comprehensive AI insights for the user's dashboard
  async generateInsights(userId: string) {
    try {
      this.logger.log(`Generating AI insights for user ${userId}`);

      // Fetch user's financial data
      const [expenses, budgets, savingsGoals, categories] = await Promise.all([
        this.expensesService.getAllExpenses(userId),
        this.budgetsService.getAllBudgets(userId),
        this.savingsGoalsService.getAllSavingsGoals(userId),
        this.categoriesService.getAllCategories(),
      ]);

      // `getAllExpenses()` returns `category_id` but not a joined `category` object.
      // Build a lookup so AI insights correctly bucket spending by category name.
      const categoryNameById = new Map<string, string>();
      categories.forEach((c: any) => {
        if (c?.id && c?.name) categoryNameById.set(String(c.id), String(c.name));
      });

      // Calculate spending by category
      const spendingByCategory: Record<string, number> = {};
      const recentExpenses = expenses.slice(0, 20); // Last 20 expenses
      let totalSpent = 0;

      recentExpenses.forEach((expense: any) => {
        const categoryId = expense.category_id ? String(expense.category_id) : '';
        const categoryName =
          expense.category?.name ||
          (categoryId ? categoryNameById.get(categoryId) : undefined) ||
          'Uncategorized';
        const amount = parseFloat(expense.amount || '0');
        spendingByCategory[categoryName] =
          (spendingByCategory[categoryName] || 0) + amount;
        totalSpent += amount;
      });

      // Find top spending categories
      const topCategories = Object.entries(spendingByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      // Calculate budget status
      const budgetStatus = budgets.map((budget: any) => ({
        name: budget.name,
        category: budget.category?.name,
        spent: parseFloat(budget.spent_amount || '0'),
        total: parseFloat(budget.total_amount || '0'),
        percentage: budget.total_amount
          ? (parseFloat(budget.spent_amount || '0') /
              parseFloat(budget.total_amount)) *
            100
          : 0,
      }));

      const overBudget = budgetStatus.filter((b: any) => b.percentage > 100);
      const nearingLimit = budgetStatus.filter(
        (b: any) => b.percentage >= 80 && b.percentage <= 100,
      );

      // Savings progress
      const savingsStatus = savingsGoals.map((goal: any) => ({
        name: goal.name,
        current: parseFloat(goal.current_amount || '0'),
        target: parseFloat(goal.target_amount || '0'),
        percentage: goal.target_amount
          ? (parseFloat(goal.current_amount || '0') /
              parseFloat(goal.target_amount)) *
            100
          : 0,
      }));

      // Build data summary for AI
      const dataSummary = {
        totalSpent,
        topCategories,
        budgetStatus,
        overBudget,
        nearingLimit,
        savingsStatus,
        expenseCount: recentExpenses.length,
      };

      // Generate AI insights
      const prompt = `You are a financial advisor analyzing a user's spending. Based on this data, provide EXACTLY 4 insights in JSON format.

DATA:
- Total spent recently: $${totalSpent.toFixed(2)}
- Top spending categories: ${topCategories.map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`).join(', ')}
- Budgets over limit: ${overBudget.length > 0 ? overBudget.map((b: any) => `${b.name} (${b.percentage.toFixed(0)}%)`).join(', ') : 'None'}
- Budgets nearing limit (80%+): ${nearingLimit.length > 0 ? nearingLimit.map((b: any) => `${b.name} (${b.percentage.toFixed(0)}%)`).join(', ') : 'None'}
- Savings goals: ${savingsStatus.length > 0 ? savingsStatus.map((s: any) => `${s.name} (${s.percentage.toFixed(0)}%)`).join(', ') : 'None'}

Respond with ONLY valid JSON array, no extra text:
[
  {"type": "warning|success|tip|alert", "title": "Short Title", "description": "Actionable advice (1-2 sentences)", "category": "category name if relevant", "amount": number if relevant},
  ...
]

Types:
- "alert": Over budget or critical issue (red)
- "warning": Nearing limit or concern (yellow)  
- "tip": Suggestion to improve (blue)
- "success": Positive progress (green)

Be specific with numbers. Generate insights even if data is limited.`;

      const response = await this.llm.invoke(prompt);
      let responseText: string;

      if (typeof response === 'string') {
        responseText = response;
      } else if (response.content) {
        if (Array.isArray(response.content)) {
          responseText = response.content
            .map((block: any) =>
              typeof block === 'string' ? block : block.text || '',
            )
            .join('');
        } else {
          responseText = String(response.content);
        }
      } else {
        responseText = JSON.stringify(response);
      }

      // Extract JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const insights = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          insights,
          summary: dataSummary,
          generatedAt: new Date().toISOString(),
        };
      }

      // Fallback insights if AI fails to return proper JSON
      throw new Error('Failed to parse AI response');
    } catch (error: any) {
      this.logger.error(`Failed to generate insights: ${error.message}`);

      // Return fallback insights
      return {
        success: true,
        insights: [
          {
            type: 'tip',
            title: 'Track Your Spending',
            description:
              'Start logging your daily expenses to get personalized insights and recommendations.',
          },
          {
            type: 'tip',
            title: 'Set Up Budgets',
            description:
              'Create budgets for different categories to keep your spending in check.',
          },
          {
            type: 'success',
            title: 'AI Insights Available',
            description:
              'Keep using SpendSense to unlock more personalized financial advice!',
          },
        ],
        summary: null,
        generatedAt: new Date().toISOString(),
        fallback: true,
      };
    }
  }

  async processCommand(
    userId: string,
    command: string,
    conversationHistory?: Array<{ role: string; content: string }>,
  ) {
    try {
      // Build context from conversation history with clear labels
      let contextInfo = '';
      if (conversationHistory && conversationHistory.length > 0) {
        // Get more history for better context (last 10 messages)
        const recentMessages = conversationHistory.slice(-10);
        const formattedHistory = recentMessages
          .map((m, i) => {
            const role = m.role === 'assistant' ? 'AI' : 'USER';
            return `[${i + 1}] ${role}: ${m.content}`;
          })
          .join('\n');

        contextInfo = `\n\n=== CONVERSATION HISTORY (READ THIS CAREFULLY!) ===
${formattedHistory}
=== END HISTORY ===

IMPORTANT: Extract information from BOTH the current message AND the history above. 
If the user previously mentioned a username or message content, USE IT - don't ask again!`;
      }

      // Get user's connections to help with fuzzy matching
      let connectionsInfo = '';
      try {
        const connections =
          await this.connectionsService.getUserConnections(userId);
        const connectedUsers = connections
          .filter((conn: any) => conn.status === 'connected')
          .map((conn: any) => {
            const otherUser =
              conn.requester?.id === userId ? conn.receiver : conn.requester;
            return otherUser
              ? `${otherUser.name || 'Unknown'} (username: ${otherUser.username})`
              : null;
          })
          .filter(Boolean);

        if (connectedUsers.length > 0) {
          connectionsInfo = `\n\nUSER'S CONNECTIONS (use for matching names/usernames):\n${connectedUsers.join(', ')}`;
        }
      } catch (e) {
        // Ignore connection fetch errors
      }

      // Get available categories for context
      const categories = await this.categoriesService.getAllCategories();
      const categoryList = categories
        .map((c) => `${c.name} (id: ${c.id}, type: ${c.type})`)
        .join(', ');

      // Use LLM to understand intent and extract entities
      const intentPrompt = `You are an AI assistant for SpendSense, a financial management app. Analyze the user's message and determine what action they want to take.

AVAILABLE ACTIONS:
1. create_budget - Create a new budget (needs: name, amount, category, period)
2. create_expense - Log an expense (needs: description, amount, category)
3. create_savings_goal - Create a savings goal (needs: name, target_amount, target_date)
4. send_message - Send a message to another user (needs: username, message)
5. confirm_action - User is confirming a pending action (yes, ok, do it, confirm, etc.)
6. cancel_action - User is canceling/rejecting a pending action (no, cancel, nevermind, etc.)
7. chat - General question or conversation (default)

AVAILABLE CATEGORIES: ${categoryList}

CRITICAL CONTEXT RULES:
- ALWAYS check conversation history to understand context and avoid asking for info already provided
- If the previous AI message asked "who to send message to?" and user replies with a name, the intent is send_message with that username
- If the previous AI message asked "what message?" and user replies, use that as the message content
- Look at the ENTIRE conversation to find username and message content - they may have been given in separate messages
- Extract ALL information from the current message AND previous messages combined
- Example: If user said "message sarem that hes gay" - extract BOTH username="sarem" AND message="that hes gay" from this single message
- Example: If user previously said "message sarem" and now says "tell him hes gay" - combine them

IMPORTANT RULES:
- If user wants to CREATE something, extract all available info but DON'T assume missing fields
- If user says "yes", "do it", "confirm", "ok", "go ahead" -> return confirm_action
- If user says "no", "cancel", "nevermind", "stop" -> return cancel_action
- Match category names loosely (e.g., "food" matches "Food & Dining", "groceries" matches "Groceries")
- For amounts, extract the number (e.g., "$50" -> 50, "fifty dollars" -> 50)
- For periods: "monthly", "weekly", "yearly", "daily" are valid
- For dates: convert to ISO format (YYYY-MM-DD)
- For usernames: be flexible with capitalization (sarem = Sarem = SAREM)
- When user says "message X that Y" or "tell X that Y" - X is username, Y is the message

Respond with JSON ONLY:
{
  "intent": "create_budget|create_expense|create_savings_goal|send_message|confirm_action|cancel_action|chat",
  "data": {
    // For create_budget: name, amount, category_id, period (monthly/weekly/yearly)
    // For create_expense: description, amount, category_id
    // For create_savings_goal: name, target_amount, target_date, priority (low/medium/high)
    // For send_message: username, message
  },
  "missing_fields": ["field1", "field2"], // What info is still needed (CHECK HISTORY FIRST!)
  "clarification": "Question to ask user if fields are missing"
}
${connectionsInfo}
${contextInfo}

User's message: ${command}

JSON response:`;

      const intentResponseRaw = await this.llm.invoke(intentPrompt);

      // Extract content from LLM response
      let responseText: string;
      if (typeof intentResponseRaw === 'string') {
        responseText = intentResponseRaw;
      } else if (intentResponseRaw.content) {
        if (Array.isArray(intentResponseRaw.content)) {
          responseText = intentResponseRaw.content
            .map((block: any) =>
              typeof block === 'string' ? block : block.text || '',
            )
            .join('');
        } else {
          responseText = String(intentResponseRaw.content);
        }
      } else {
        responseText = JSON.stringify(intentResponseRaw);
      }

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse intent');
      }

      const intentResponse = JSON.parse(jsonMatch[0]);
      this.logger.log(`Intent detected: ${JSON.stringify(intentResponse)}`);

      // Handle different intents
      switch (intentResponse.intent) {
        case 'create_budget':
          return await this.handleCreateBudget(
            userId,
            intentResponse,
            conversationHistory,
          );

        case 'create_expense':
          return await this.handleCreateExpense(
            userId,
            intentResponse,
            conversationHistory,
          );

        case 'create_savings_goal':
          return await this.handleCreateSavingsGoal(
            userId,
            intentResponse,
            conversationHistory,
          );

        case 'send_message':
          return await this.handleSendMessage(userId, intentResponse);

        case 'confirm_action':
          return {
            action: 'confirm_action',
            response:
              "I don't have a pending action to confirm. What would you like me to do?",
          };

        case 'cancel_action':
          return {
            action: 'cancel_action',
            response: 'Action cancelled. What else can I help you with?',
          };

        default:
          return {
            action: 'chat',
            response: await this.chat(userId, command, conversationHistory),
          };
      }
    } catch (error: any) {
      this.logger.error(`processCommand error: ${error.message}`);
      return {
        action: 'chat',
        response: await this.chat(userId, command, conversationHistory),
      };
    }
  }

  private async handleCreateBudget(
    userId: string,
    intentResponse: any,
    conversationHistory?: Array<{ role: string; content: string }>,
  ) {
    const data = intentResponse.data || {};
    const missing = intentResponse.missing_fields || [];

    // Try to generate a default name if missing but we have category
    if (!data.name && data.category_id) {
      const category = await this.categoriesService.getCategoryById(
        data.category_id,
      );
      if (category) {
        data.name = `${category.name} Budget`;
        // Remove 'name' from missing if it was there
        const nameIndex = missing.indexOf('name');
        if (nameIndex > -1) missing.splice(nameIndex, 1);
      }
    }

    // Check if we have enough info
    if (!data.amount || !data.category_id) {
      const missingFields: string[] = [];
      if (!data.amount) missingFields.push('amount');
      if (!data.category_id) missingFields.push('category');

      const clarification =
        intentResponse.clarification ||
        `I need more details to create the budget. Please provide: ${missingFields.join(', ')}`;
      return {
        action: 'needs_info',
        pendingAction: 'create_budget',
        pendingData: data,
        response: `📊 **Creating a budget**\n\n${clarification}`,
      };
    }

    // We have all required fields - create the budget
    try {
      // Calculate start and end dates based on period
      const now = new Date();
      const startDate = now.toISOString().split('T')[0];
      let endDate: string;

      const period = data.period || 'monthly';
      switch (period) {
        case 'weekly':
          endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
          break;
        case 'yearly':
          endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
          break;
        case 'monthly':
        default:
          endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
      }

      await this.budgetsService.createBudget(
        {
          name: data.name,
          total_amount: String(parseFloat(data.amount)),
          category: data.category_id,
          period: period,
          start_date: startDate,
          end_date: endDate,
          created_by: userId,
          participants: [userId],
        },
        userId,
      );

      return {
        action: 'created',
        response: `✅ **Budget Created!**\n\n• **Name:** ${data.name}\n• **Amount:** $${parseFloat(data.amount).toFixed(2)}\n• **Period:** ${data.period || 'monthly'}\n\nYour budget is now active and will track your spending!`,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create budget: ${error.message}`);
      return {
        action: 'error',
        response: `❌ Sorry, I couldn't create the budget: ${error.message}`,
      };
    }
  }

  private async handleCreateExpense(
    userId: string,
    intentResponse: any,
    conversationHistory?: Array<{ role: string; content: string }>,
  ) {
    const data = intentResponse.data || {};
    const missing = intentResponse.missing_fields || [];

    if (missing.length > 0 || !data.amount || !data.category_id) {
      const clarification =
        intentResponse.clarification ||
        `I need more details to log the expense. Please provide: ${missing.join(', ')}`;
      return {
        action: 'needs_info',
        pendingAction: 'create_expense',
        pendingData: data,
        response: `💸 **Logging an expense**\n\n${clarification}`,
      };
    }

    try {
      await this.expensesService.createExpense(
        {
          description: data.description || 'Expense',
          amount: parseFloat(data.amount),
          category_id: data.category_id,
          date: data.date || new Date().toISOString().split('T')[0],
        },
        userId,
      );

      return {
        action: 'created',
        response: `✅ **Expense Logged!**\n\n• **Description:** ${data.description || 'Expense'}\n• **Amount:** $${parseFloat(data.amount).toFixed(2)}\n• **Date:** ${data.date || 'Today'}\n\nThe expense has been added to your records.`,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create expense: ${error.message}`);
      return {
        action: 'error',
        response: `❌ Sorry, I couldn't log the expense: ${error.message}`,
      };
    }
  }

  private async handleCreateSavingsGoal(
    userId: string,
    intentResponse: any,
    conversationHistory?: Array<{ role: string; content: string }>,
  ) {
    const data = intentResponse.data || {};
    const missing = intentResponse.missing_fields || [];

    if (missing.length > 0 || !data.name || !data.target_amount) {
      const clarification =
        intentResponse.clarification ||
        `I need more details to create the savings goal. Please provide: ${missing.join(', ')}`;
      return {
        action: 'needs_info',
        pendingAction: 'create_savings_goal',
        pendingData: data,
        response: `🎯 **Creating a savings goal**\n\n${clarification}`,
      };
    }

    try {
      // Default target date to 1 year from now if not provided
      const targetDate =
        data.target_date ||
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];

      // Get a default category if not provided
      let categoryId = data.category_id;
      if (!categoryId) {
        const categories = await this.categoriesService.getAllCategories();
        const savingsCategory = categories.find(
          (c) =>
            c.name.toLowerCase().includes('saving') || c.type === 'savings',
        );
        categoryId = savingsCategory?.id || categories[0]?.id;
      }

      await this.savingsGoalsService.createSavingsGoal(userId, {
        name: data.name,
        target_amount: parseFloat(data.target_amount),
        target_date: targetDate,
        priority: data.priority || 'medium',
        current_amount: 0,
        category_id: categoryId,
      });

      return {
        action: 'created',
        response: `✅ **Savings Goal Created!**\n\n• **Goal:** ${data.name}\n• **Target:** $${parseFloat(data.target_amount).toFixed(2)}\n• **Deadline:** ${targetDate}\n• **Priority:** ${data.priority || 'medium'}\n\nStart saving towards your goal!`,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create savings goal: ${error.message}`);
      return {
        action: 'error',
        response: `❌ Sorry, I couldn't create the savings goal: ${error.message}`,
      };
    }
  }

  private async handleSendMessage(userId: string, intentResponse: any) {
    const data = intentResponse.data || {};
    const targetUsername = data.username?.trim()?.toLowerCase();
    const messageContent = data.message?.trim();

    if (!targetUsername) {
      return {
        action: 'needs_info',
        response: '📨 Who would you like me to send a message to?',
      };
    }

    if (!messageContent) {
      return {
        action: 'needs_info',
        response: `📨 What message would you like me to send to ${data.username}?`,
      };
    }

    try {
      // FIRST: Search within connected users (this is the most common case)
      const connections =
        await this.connectionsService.getUserConnections(userId);

      this.logger.log(
        `User ${userId} has ${connections.length} total connections`,
      );

      const connectedUsers = connections
        .filter((conn: any) => conn.status === 'connected')
        .map((conn: any) => {
          const otherUser =
            conn.requester?.id === userId ? conn.receiver : conn.requester;
          return otherUser;
        })
        .filter((user: any) => user != null);

      this.logger.log(
        `Connected users: ${connectedUsers.map((u: any) => `${u.name}(${u.username})`).join(', ')}`,
      );

      // Fuzzy match within connected users
      let targetUser = connectedUsers.find((user: any) => {
        const username = (user.username || '').toLowerCase();
        const name = (user.name || '').toLowerCase();
        const firstName = name.split(' ')[0];

        return (
          username === targetUsername ||
          name === targetUsername ||
          firstName === targetUsername ||
          username.includes(targetUsername) ||
          name.includes(targetUsername) ||
          targetUsername.includes(username) ||
          targetUsername.includes(firstName)
        );
      });

      if (targetUser) {
        this.logger.log(
          `Matched "${targetUsername}" to connected user "${targetUser.name}" (${targetUser.username})`,
        );
      }

      // If no match in connections, try global user search (less common)
      if (!targetUser) {
        targetUser = await this.usersService.getUserByUsername(targetUsername);
        if (targetUser) {
          this.logger.log(
            `Found user by exact username: ${targetUser.username}`,
          );
        }
      }

      if (!targetUser) {
        // Suggest connected users (we already have them)
        const connectedNames = connectedUsers
          .map((user: any) => user?.name || user?.username)
          .filter(Boolean)
          .slice(0, 5);

        if (connectedNames.length > 0) {
          return {
            action: 'error',
            response: `❌ I couldn't find "${data.username}" in your connections. Your connections: **${connectedNames.join(', ')}**. Try using one of these names!`,
          };
        }

        return {
          action: 'error',
          response: `❌ I couldn't find anyone named "${data.username}". You don't have any connections yet - add someone from the Connections page first!`,
        };
      }

      const result = await this.sendMessageToUser(
        userId,
        targetUser.id,
        messageContent,
        'User requested via AI',
      );

      return {
        action: 'message_sent',
        response: `✅ **Message sent to ${targetUser.name || targetUser.username}!**\n\n"${messageContent}"\n\nCheck your Messages page to see the conversation.`,
        conversationId: result.conversationId,
      };
    } catch (error: any) {
      this.logger.error(`Failed to send message: ${error.message}`);
      return {
        action: 'error',
        response: `❌ ${error.message}`,
      };
    }
  }

  private getFallbackResponse(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('budget')) {
      return "I can help you manage your budgets! Create a budget by setting a spending limit for each category, and I'll help you track your progress. Make sure your Groq API key is configured for full AI features.";
    }
    if (lowerMessage.includes('expense')) {
      return "To track expenses, simply add them with a category, amount, and date. I'll help you identify spending patterns once you set up your Groq API key.";
    }
    if (lowerMessage.includes('save') || lowerMessage.includes('savings')) {
      return "Setting savings goals is a great way to build wealth! Create a goal with a target amount and deadline, and I'll track your progress.";
    }

    return `I'm here to help you manage your finances! Ask me about:
• Creating and managing budgets
• Tracking expenses effectively
• Setting up savings goals
• Splitting bills with friends
• Generating financial reports

Note: For full AI features, please set up your FREE Groq API key from https://console.groq.com`;
  }

  // ========== AI Conversation Management ==========

  async getOrCreateAiConversation(userId: string) {
    try {
      // Check if AI conversation already exists for this user
      const conversations =
        await this.conversationsService.getActiveConversationsForUser(userId);

      const aiConv = conversations.find((conv) => conv.type === 'ai');

      if (aiConv) {
        return { conversation: aiConv, isNew: false };
      }

      // Create new AI conversation
      const {
        ConversationType,
      } = require('../conversations/conversations.entity');

      const newConv = await this.conversationsService.createAiConversation(
        userId,
        {
          name: 'AI Assistant',
          type: ConversationType.AI,
        },
      );

      // Send welcome message from AI
      const welcomeMessage = `👋 Hi! I'm your AI financial assistant. I can help you:

• **Create budgets** - "Create a $500 monthly food budget"
• **Log expenses** - "I spent $30 on lunch"
• **Set savings goals** - "Save $5000 for vacation by December"
• **Send messages** - "Tell John I'll pay him tomorrow"
• **Answer questions** - "How do I manage my finances better?"

Try me out! What would you like to do?`;

      // Use createAiMessage for AI conversations
      await this.messageHistoryService.createAiMessage(
        'ai-assistant',
        newConv.id,
        welcomeMessage,
      );

      return { conversation: newConv, isNew: true };
    } catch (error: any) {
      this.logger.error(
        `Failed to get/create AI conversation: ${error.message}`,
      );
      throw error;
    }
  }

  async getAiMessages(userId: string) {
    try {
      const { conversation } = await this.getOrCreateAiConversation(userId);
      // Use the AI-specific method that bypasses participant check
      const result = await this.messageHistoryService.getAiConversationMessages(
        conversation.id,
        { page: 1, limit: 100 },
      );
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to get AI messages: ${error.message}`);
      return { messages: [], total: 0, page: 1, limit: 100 };
    }
  }

  async processCommandWithHistory(userId: string, message: string) {
    try {
      // Get or create AI conversation
      const { conversation } = await this.getOrCreateAiConversation(userId);

      // Save user's message to database (use AI-specific method)
      await this.messageHistoryService.createAiMessage(
        userId,
        conversation.id,
        message,
      );

      // Get recent messages for context
      const result = await this.messageHistoryService.getAiConversationMessages(
        conversation.id,
        { page: 1, limit: 10 },
      );

      // Build conversation history for LLM
      const conversationHistory = result.messages.map((msg: any) => ({
        role:
          msg.ai_sender_id === 'ai-assistant' || msg.sender?.id === undefined
            ? 'assistant'
            : 'user',
        content: msg.content,
      }));

      // Process the command
      const aiResult = await this.processCommand(
        userId,
        message,
        conversationHistory,
      );

      // Ensure AI-facing responses are plain text (no markdown) when enabled
      aiResult.response = this.formatAiResponse(aiResult.response);

      // Save AI response to database
      await this.messageHistoryService.createAiMessage(
        'ai-assistant',
        conversation.id,
        aiResult.response,
      );

      return {
        ...aiResult,
        conversationId: conversation.id,
      };
    } catch (error: any) {
      this.logger.error(`processCommandWithHistory error: ${error.message}`);
      return {
        action: 'error',
        response: 'Sorry, I encountered an error. Please try again.',
      };
    }
  }
}
