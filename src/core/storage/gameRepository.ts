import { getDatabase, StoredGame } from './db';

export class GameRepository {
  public static async saveGame(game: StoredGame): Promise<string> {
    const db = await getDatabase();
    await db.put('games', game);
    return game.id;
  }

  public static async getGame(id: string): Promise<StoredGame | undefined> {
    const db = await getDatabase();
    return db.get('games', id);
  }

  public static async getAllGames(): Promise<StoredGame[]> {
    const db = await getDatabase();
    const games = await db.getAll('games');
    // Sort descending by date
    return games.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public static async deleteGame(id: string): Promise<void> {
    const db = await getDatabase();
    await db.delete('games', id);
  }
}
