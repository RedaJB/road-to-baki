/** Personnage et couleur de l'appli : Baki, en rouge */
export interface FighterLook {
  id: string;
  name: string;
  color: string;
  color2: string;
}

export const FIGHTER_LOOKS: FighterLook[] = [{ id: 'baki', name: 'Baki', color: '#e5484d', color2: '#a1272c' }];

export function getLook(id: string | null | undefined): FighterLook {
  return FIGHTER_LOOKS.find((f) => f.id === id) ?? FIGHTER_LOOKS[0];
}
