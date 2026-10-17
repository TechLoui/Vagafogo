const normalize = (value: string): string => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/\s+/g, " ")
  .trim();

export const shouldOfferEnvironmentalEducationContact = (message: string): boolean => {
  const text = normalize(message);
  return /\b(?:educacao ambiental|visita(?:s)? escolar(?:es)?|passeio(?:s)? escolar(?:es)?|excurs(?:ao|oes) escolar(?:es)?|projeto(?:s)? (?:ambiental|ambientais)|grupo(?:s)? de (?:alunos|estudantes)|turma(?:s)? de (?:alunos|estudantes)|escola(?:s)? publica(?:s)?|escola(?:s)? particular(?:es)?|instituto federal|ifb)\b/.test(text);
};
