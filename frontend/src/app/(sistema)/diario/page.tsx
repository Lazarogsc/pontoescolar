import type { Metadata } from "next";
import { Cabecalho, Cartao, ui } from "@/components/ui";

export const metadata: Metadata = { title: "Diário" };

const PREVISTO = [
  "Lançamento de notas por disciplina e bimestre",
  "Chamada diária com registro de faltas",
  "Conteúdo ministrado em cada aula",
  "Acesso do professor só às suas turmas",
];

export default function DiarioPage() {
  return (
    <>
      <Cabecalho titulo="Diário de classe" subtitulo="Notas, frequência e conteúdo das aulas" />

      <Cartao titulo="Em construção" extra={<span className={`${ui.tag} ${ui.tagAviso}`}>Próxima etapa</span>}>
        <ul className={ui.lista}>
          {PREVISTO.map((item) => (
            <li key={item}>
              <div>
                <strong>{item}</strong>
              </div>
            </li>
          ))}
        </ul>
      </Cartao>
    </>
  );
}
