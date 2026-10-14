# Vetor — Autocuidado em pequenos passos

Aplicativo de autocuidado, ativação comportamental, respiração controlada e registro de pensamentos inspirado na Terapia Cognitivo-Comportamental (TCC).

Reescrito como uma aplicação moderna em **React 19 + TypeScript + Vite + Tailwind CSS**.

## Módulos e Recursos

1. **Hoje**:
   - Microações de 5 minutos com cronômetro interativo, senso de realização e prazer.
   - Check-in rápido diário (ânimo e ansiedade na escala 1–5).
   - Hábitos de base (medicação, movimento, luz solar, sono e conexão social).
   - Atalhos para outras áreas e retomada de rascunhos.

2. **Acalmar**:
   - Exercício de respiração guiada (5 minutos) com animação suave de expansão e contração, suporte à respiração controlada e diafragmática, e pausa opcional.
   - Ferramentas de manejo da ansiedade (respiração preventiva ancorada em hábitos, relaxamento postural, redirecionamento da atenção, afastamento temporário, estímulo frio opcional e registro de atividade aeróbica).
   - Orientação sensorial 5–4–3–2–1.
   - Separador de preocupação de ação (conversão direta para microação no Hoje ou adiamento consciente).
   - Avisos médicos importantes e contatos de apoio e emergência (SAMU 192, CVV 188).

3. **Práticas Cotidianas**:
   - 16 práticas sugeridas organizadas por contexto (Casa e ambiente, Trabalho e estudos, Autocuidado, Rotina e transições).
   - Favoritos, adaptação e criação de práticas personalizadas com gatilhos naturais.
   - Registro diário e histórico de práticas realizadas.

4. **Pensamentos**:
   - Registro de pensamento estruturado em 3 etapas com indicador de progresso visual.
   - Auto-salvamento de rascunhos no navegador com retomada instantânea.
   - Salvamento completo e salvamento parcial.
   - Histórico dos registros cognitivos com detalhamento de situação, pensamentos automáticos, emoção, intensidade, evidências e resposta equilibrada.

5. **Áudios e Sons**:
   - Biblioteca intencionalmente reservada para inclusão futura de conteúdos autorizados e revisados (sem áudios fictícios, narração artificial ou botões simulados).

6. **Progresso & Privacidade**:
   - Estatísticas consolidadas dos últimos 7 dias (médias de ânimo e ansiedade, dias de check-in, ações, práticas e minutos aeróbicos).
   - Gráfico de barras semanal do ânimo.
   - Revisão e reflexão semanal aberta.
   - Histórico de ações e técnicas.
   - Exportação de resumo em texto para a área de transferência.
   - Backup e restauração via arquivos JSON compatíveis.
   - Opção de exclusão total de dados locais mediante confirmação de segurança.

## Tecnologias

- **React 19**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- Armazenamento 100% local no navegador (`localStorage`), sem envio a servidores externos ou necessidade de login.

## Executando localmente

```bash
npm install
npm run dev
```

Acesse em `http://localhost:3000`.
