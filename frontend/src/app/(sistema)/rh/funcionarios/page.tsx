import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho, Cartao, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { exigir } from "@/lib/sessao";

export const metadata: Metadata = { title: "Funcionários" };

export default async function FuncionariosPage() {
  const [, funcionarios] = await Promise.all([exigir("rh_gestao"), api.funcionarios()]);
  const setores = [...new Set(funcionarios.map((f) => f.setor))];

  return (
    <>
      <Cabecalho titulo="Funcionários" subtitulo="Ficha de cada funcionário: ponto, contracheque, férias, benefícios, dados cadastrais e lançamentos do RH">
        <Link className="btn btn-secundario" href="/rh">
          Controle de colaboradores
        </Link>
      </Cabecalho>

      <div className={ui.grade3}>
        {setores.map((setor) => (
          <Cartao key={setor} titulo={setor}>
            <ul className={ui.lista}>
              {funcionarios
                .filter((f) => f.setor === setor)
                .map((f) => (
                  <li key={f.id}>
                    <div>
                      <Link href={`/meu-rh/${f.id}`}>
                        <strong>{f.nome}</strong>
                      </Link>
                      <span>{f.cargo}</span>
                    </div>
                    <span className="mono">{f.jornada_diaria}</span>
                  </li>
                ))}
            </ul>
          </Cartao>
        ))}
      </div>
    </>
  );
}
