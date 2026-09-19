export default function Loading() {
  return (
    <div className="an-page-loader" role="status" aria-label="Loading">
      <div className="an-loader-center">
        <div className="an-loader-mark" aria-hidden="true">
          <span className="an-loader-letter an-letter-a">A</span>
          <span className="an-loader-letter an-letter-n">N</span>
        </div>

        <div className="an-loader-line" aria-hidden="true">
          <span />
        </div>

        <p className="an-loader-label">AVANCY</p>
      </div>
    </div>
  );
}
