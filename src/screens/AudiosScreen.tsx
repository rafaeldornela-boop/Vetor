import React from 'react';

export const AudiosScreen: React.FC = () => {
  const audioCategories = [
    {
      icon: '🎧',
      title: 'Meditação guiada',
      desc: 'Espaço reservado para conteúdos guiados revisados e adicionados futuramente.',
    },
    {
      icon: '🌿',
      title: 'Relaxamento corporal',
      desc: 'Áudios para acompanhar o relaxamento progressivo, quando os arquivos estiverem disponíveis.',
    },
    {
      icon: '🌧️',
      title: 'Sons da natureza e ambientes tranquilos',
      desc: 'Sons ambientais reais, sem reprodução automática.',
    },
    {
      icon: '🎯',
      title: 'Concentração ou pausa',
      desc: 'Paisagens sonoras para períodos de foco ou pequenas pausas.',
    },
    {
      icon: '🌙',
      title: 'Desacelerar antes de dormir',
      desc: 'Conteúdos para compor uma rotina noturna, sem prometer induzir o sono.',
    },
  ];

  return (
    <section className="screen active" id="screen-audios" aria-labelledby="title-audios">
      <div className="intro">
        <div className="eyebrow">Biblioteca de áudio</div>
        <h1 id="title-audios">Um espaço para escutar com calma.</h1>
        <p className="sub">
          Esta biblioteca está preparada para receber arquivos reais em uma atualização futura. Nenhum áudio é simulado ou reproduzido nesta versão.
        </p>
      </div>

      <article className="card">
        {audioCategories.map((item) => (
          <div key={item.title} className="audio-empty">
            <div className="audio-icon" aria-hidden="true">
              {item.icon}
            </div>
            <div>
              <h2>{item.title}</h2>
              <p className="hint">{item.desc}</p>
              <span className="mini-tag">Conteúdo futuro</span>
            </div>
          </div>
        ))}

        <div className="subtle-box" style={{ marginTop: '14px' }}>
          Os itens acima são categorias vazias. Não há botões de reprodução, narração, síntese de fala nem serviços externos de áudio nesta versão.
        </div>
      </article>
    </section>
  );
};
