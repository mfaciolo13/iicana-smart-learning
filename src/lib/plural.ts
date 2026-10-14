/** "1 clase" / "3 clases": evita plurales armados a mano ("evaluaciónes", "3alumno(s)") (SCRUM-328). */
export function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
