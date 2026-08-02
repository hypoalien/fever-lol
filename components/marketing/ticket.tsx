/**
 * The hero's signature element: an admission ticket for the product itself.
 *
 * A real stub — body, punched perforation, tear-off end — because tickets are
 * what the platform makes. The pitch is delivered on the artifact rather than
 * beside it.
 */

/** A deterministic QR-like block. Decorative, so it carries no data. */
function QrMark() {
  // Fixed pattern rather than random, so the markup is stable between renders.
  const cells = [
    "1111111011010001111111", "1000001010111010000001", "1011101001000010111101",
    "1011101011011010111011", "1011101000101010111011", "1000001011010010000001",
    "1111111010101011111111", "0000000011100000000000", "1101011101011011010110",
    "0110110010110100101101", "1011001101001011011010", "0100110011010100110011",
    "1101011001101011001101", "0010110110010110110010", "1101101001101001011011",
    "0000000110101101010110", "1111111011011010110101", "1000001001010110101101",
    "1011101010110101011010", "1011101101011010110101", "1011101010101101011010",
    "1111111011010110101101",
  ];

  return (
    <svg viewBox="0 0 22 22" aria-hidden="true" shapeRendering="crispEdges">
      <rect width="22" height="22" fill="#fff" />
      {cells.flatMap((row, y) =>
        [...row].map((cell, x) =>
          cell === "1" ? (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#12151A" />
          ) : null
        )
      )}
    </svg>
  );
}

export function HeroTicket() {
  return (
    <div className="mkt-ticket">
      <div className="mkt-ticket-body">
        <div className="mkt-ticket-row mkt-data">
          <span>Fever.lol · General Admission</span>
          <span>No. 000001</span>
        </div>

        <p className="mkt-ticket-title">Your event, your money</p>
        <p className="mkt-fee-note">
          Every ticket you sell settles straight into your own payment account.
        </p>

        <dl className="mkt-ticket-meta">
          <div>
            <dt className="mkt-data">Platform fee</dt>
            <dd>0%</dd>
          </div>
          <div>
            <dt className="mkt-data">Payout</dt>
            <dd>Direct to you</dd>
          </div>
          <div>
            <dt className="mkt-data">Source</dt>
            <dd>MIT</dd>
          </div>
          <div>
            <dt className="mkt-data">Hosting</dt>
            <dd>Ours or yours</dd>
          </div>
        </dl>
      </div>

      <div className="mkt-stub">
        <span className="mkt-admit">Admit one</span>
        <div className="mkt-qr">
          <QrMark />
        </div>
        <span className="mkt-data" style={{ color: "#12151A" }}>
          Scan at door
        </span>
      </div>
    </div>
  );
}
