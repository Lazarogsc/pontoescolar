import type { Modulo } from "./sessao";

export type ItemMenu = { href: string; rotulo: string; exato?: boolean };
export type GrupoMenu = { setor: string; modulos: Modulo[]; itens: (ItemMenu & { modulos?: Modulo[] })[] };

/**
 * Menu agrupado por setor. O grupo aparece para quem tem algum dos `modulos`
 * (o item pode restringir mais). `exato` = só fica ativo na própria URL.
 */
export const MENU: GrupoMenu[] = [
  {
    setor: "Secretaria",
    modulos: ["secretaria"],
    itens: [
      { href: "/secretaria", rotulo: "Painel", exato: true },
      { href: "/matriculas", rotulo: "Matrículas" },
      { href: "/alunos", rotulo: "Alunos" },
      { href: "/turmas", rotulo: "Turmas" },
      { href: "/diario", rotulo: "Diário" },
      { href: "/financeiro", rotulo: "Financeiro" },
      { href: "/comunicados", rotulo: "Comunicados" },
    ],
  },
  {
    setor: "Diretoria",
    modulos: ["diretoria"],
    itens: [
      { href: "/diretoria", rotulo: "Visão geral", exato: true },
      { href: "/diretoria/inadimplentes", rotulo: "Inadimplentes" },
      { href: "/diretoria/materiais", rotulo: "Venda de materiais" },
      { href: "/diretoria/compras", rotulo: "Compras da escola" },
    ],
  },
  {
    setor: "Professores",
    modulos: ["professores", "professores_gestao"],
    itens: [
      { href: "/professores", rotulo: "Comunicados", exato: true },
      { href: "/professores/materiais", rotulo: "Envio de material", modulos: ["professores"] },
      { href: "/professores/avaliacoes", rotulo: "Envio de avaliação", modulos: ["professores"] },
    ],
  },
  {
    setor: "CPD",
    modulos: ["cpd", "cpd_diagramacao", "cpd_revisao"],
    itens: [
      { href: "/cpd", rotulo: "Recebimento de material", exato: true, modulos: ["cpd"] },
      { href: "/cpd/diagramacao", rotulo: "Diagramação", modulos: ["cpd_diagramacao", "cpd_coordenacao"] },
      { href: "/cpd/revisao", rotulo: "Revisão de materiais", modulos: ["cpd_revisao", "cpd_coordenacao"] },
      { href: "/cpd/impressoras", rotulo: "Impressoras", modulos: ["cpd"] },
      { href: "/cpd/fechamento", rotulo: "Fechamento mensal", modulos: ["cpd"] },
    ],
  },
  {
    setor: "CGA",
    modulos: ["cga"],
    itens: [
      { href: "/cga", rotulo: "Avaliações recebidas", exato: true },
      { href: "/cga/provas", rotulo: "Provas e correção" },
    ],
  },
  {
    setor: "RH",
    modulos: ["rh_gestao"],
    itens: [
      { href: "/rh", rotulo: "Controle de colaboradores", exato: true },
      { href: "/rh/funcionarios", rotulo: "Funcionários" },
      { href: "/rh/suprimentos", rotulo: "Suprimentos" },
    ],
  },
  {
    setor: "Portais",
    modulos: ["portal", "familia"],
    itens: [
      { href: "/responsavel", rotulo: "Portal do Responsável", modulos: ["portal", "familia"] },
    ],
  },
  {
    setor: "Administração",
    modulos: ["admin"],
    // Configurações e registro de atividades são abas dentro do próprio Painel
    itens: [{ href: "/painel-controle", rotulo: "Painel de Controle" }],
  },
];

/** Só os grupos e itens que o usuário pode ver. */
export function menuDoUsuario(modulos: Modulo[], setor: string): { setor: string; itens: ItemMenu[] }[] {
  const tem = (lista: Modulo[]) => lista.some((m) => modulos.includes(m));
  const grupos: { setor: string; itens: ItemMenu[] }[] = [{
    setor: "Geral",
    itens: [
      { href: "/", rotulo: "Início", exato: true },
      ...(setor !== "Responsável" && tem(["meu_rh"]) ? [{ href: "/meu-rh", rotulo: "Meu RH" }] : []),
    ],
  }, ...MENU.filter((g) => tem(g.modulos))
    .map((g) => ({ setor: g.setor, itens: g.itens.filter((i) => !i.modulos || tem(i.modulos)).map(({ href, rotulo, exato }) => ({ href, rotulo, exato })) }))
    .filter((g) => g.itens.length)];
  if (tem(["suprimentos"])) {
    const grupoDoSetor: Record<string, string> = {
      Docentes: "Professores",
      CPD: "CPD",
      "Coordenação do CPD": "CPD",
      Diagramação: "CPD",
      Revisão: "CPD",
    };
    const nome = grupoDoSetor[setor] ?? setor;
    const grupo = grupos.find((g) => g.setor === nome);
    const item = { href: "/suprimentos", rotulo: "Solicitar material" };
    if (grupo) grupo.itens.push(item);
    else {
      const antesDosPortais = grupos.findIndex((g) => g.setor === "Portais");
      grupos.splice(antesDosPortais < 0 ? grupos.length : antesDosPortais, 0, { setor: nome, itens: [item] });
    }
  }
  return grupos;
}

export function itemAtivo(item: ItemMenu, caminho: string) {
  if (item.exato) return caminho === item.href;
  return caminho === item.href || caminho.startsWith(`${item.href}/`);
}
