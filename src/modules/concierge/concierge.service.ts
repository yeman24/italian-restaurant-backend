import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { MenuService } from '@/modules/menu/menu.service';
import { FilterDishesDto } from '@/modules/menu/dto/filter-dishes.dto';
import { ConciergeChatDto } from './dto/concierge-chat.dto';

@Injectable()
export class ConciergeService {
  private readonly logger = new Logger(ConciergeService.name);
  private readonly gemini?: GoogleGenAI;
  private readonly model: string;

  constructor(
    private readonly config: ConfigService,
    private readonly menuService: MenuService,
  ) {
    const apiKey = this.config.get<string>('gemini.apiKey');
    this.model = this.config.get<string>('gemini.model', 'gemini-2.5-flash-lite');
    if (apiKey) this.gemini = new GoogleGenAI({ apiKey });
  }

  async chat(dto: ConciergeChatDto) {
    const context = await this.getMenuContext();

    if (!this.gemini) {
      return {
        message: this.localReply(dto.message, context),
        mode: 'local',
      };
    }

    try {
      const history = (dto.history || []).slice(-8).map((item) => ({
        role: item.role,
        content: item.content,
      }));

      const response = await this.gemini.models.generateContent({
        model: this.model,
        contents: [
          {
            role: 'user',
            parts: [{ text: `Conversation so far:\n${history.map((item) => `${item.role}: ${item.content}`).join('\n')}\n\nGuest's latest question:\n${dto.message}` }],
          },
        ],
        config: {
          systemInstruction: `You are the dining concierge at AURA Edinburgh, an acclaimed fine dining restaurant.

Key Guidelines:
- Speak naturally, warmly, and conversationally, like a gracious and knowledgeable host.
- Keep your answers concise and direct: aim for 2 to 3 natural sentences (about 30 to 60 words).
- Focus only on what the guest asked. Do not tack on unsolicited booking links, tasting menu upsells, or allergy disclaimers unless relevant to their specific question.
- Base your answers strictly on the verified restaurant context below. Never invent prices or items.

Verified restaurant context:
${context}`,
          temperature: 0.65,
          maxOutputTokens: 150,
        },
      });

      return {
        message: response.text || this.localReply(dto.message, context),
        mode: 'ai',
      };
    } catch (error) {
      this.logger.warn(`Gemini concierge unavailable; using local fallback: ${error instanceof Error ? error.message : 'unknown error'}`);
      return {
        message: this.localReply(dto.message, context),
        mode: 'local',
      };
    }
  }

  private async getMenuContext(): Promise<string> {
    const dishFilter = new FilterDishesDto();
    dishFilter.limit = 100;

    const [dishResult, tastingMenus] = await Promise.all([
      this.menuService.findAllDishes(dishFilter),
      this.menuService.findAllTastingMenus(),
    ]);

    const dishes = (dishResult.data || dishResult).map((dish: any) => ({
      name: dish.name,
      description: dish.description,
      provenance: dish.provenance,
      price: Number(dish.price),
      dietary: dish.dietary,
      allergens: dish.allergens,
      winePairing: dish.winePairing,
    }));

    return JSON.stringify({
      address: '14–16 Royal Terrace Vaults, Edinburgh, EH7 5TB',
      hours: 'Dinner Wed–Sat 17:30–23:00; lunch Fri–Sat 12:00–14:30; Sunday Supper 17:00–22:00',
      reservationPolicy: 'Reservations open 90 days ahead; cancellations require 48 hours notice.',
      tastingMenus: tastingMenus.map((menu: any) => ({
        title: menu.title,
        subtitle: menu.subtitle,
        price: Number(menu.price),
        pairingPrice: Number(menu.pairingPrice),
        coursesCount: menu.coursesCount,
        duration: menu.duration,
      })),
      dishes,
    });
  }

  private localReply(message: string, context: string): string {
    const query = message.toLowerCase();
    const data = JSON.parse(context);
    const dishes = data.dishes as Array<any>;

    if (/allerg|shellfish|mollusc|gluten|dairy|nut/.test(query)) {
      return 'I can highlight ingredients and dietary tags, but allergy safety must be confirmed by our kitchen team for your specific visit. Tell us your restriction in the reservation form or contact the concierge before booking.';
    }

    if (/reserv|book|table|availability|date|time/.test(query)) {
      return 'I can help you choose the experience, then you can check live dates and sittings in the reservation flow. AURA offers the Autumn Terroir, Forager’s Harvest, and Chef’s Atelier Counter experiences.';
    }

    if (/wine|pairing|sommelier|drink/.test(query)) {
      const pairing = dishes.find((dish) => dish.winePairing);
      return pairing
        ? `Our sommelier pairings are built course by course. A lovely example is ${pairing.winePairing.name} with ${pairing.name}. The standard tasting pairing is available alongside the menu.`
        : 'Our sommelier curates pairings for each seasonal course. The reservation flow includes standard, prestige, and botanical pairing options.';
    }

    if (/hour|open|time|schedule|when/.test(query)) {
      return `Our opening hours are:\n• Dinner: Wed–Sat 17:30–23:00\n• Lunch: Fri–Sat 12:00–14:30\n• Sunday Supper: 17:00–22:00\n\nReservations open 90 days in advance.`;
    }

    if (/address|location|where|find you|directions|postcode/.test(query)) {
      return `AURA is located at ${data.address || '14–16 Royal Terrace Vaults, Edinburgh, EH7 5TB'}, situated in historic 18th-century stone vaults.`;
    }

    const dietary = ['vegan', 'vegetarian', 'pescatarian', 'gluten-free', 'dairy-free'].find((tag) => query.includes(tag));
    const asksForFood = dietary || /recommend|dish|food|eat|starter|course|taste|menu|try|order/.test(query);

    if (asksForFood) {
      const matches = dietary
        ? dishes.filter((dish) => dish.dietary?.includes(dietary)).slice(0, 2)
        : dishes.filter((dish) => /earthy|mushroom|venison|scallop|sea|fish|meat|vegetable/.test(`${dish.name} ${dish.description}`)).slice(0, 2);

      if (matches.length) {
        return `I would start with ${matches.map((dish) => `${dish.name} (£${dish.price})`).join(' and ')}. Each dish includes provenance and pairing notes on the menu. For the full experience, the Autumn Terroir is ${data.tastingMenus[0]?.coursesCount || 8} courses.`;
      }
    }

    return 'Welcome to AURA. I can recommend dishes, explain Scottish provenance, suggest pairings, answer dining-policy questions, or guide you to reserve a table. What kind of evening are you imagining?';
  }
}
