import Link from "next/link";
import styles from "./page.module.css";

/**
 * DID 정보 페이지 (서버 컴포넌트)
 * - 정적 콘텐츠만 포함
 * - SEO 최적화
 */
export default function DID_info() {
  return (
    <div className={styles.container}>
      <Link href="/main" className={styles.homeButton}>
        ← 홈으로 돌아가기
      </Link>

      <h1 className={styles.title}>펫 DID란?</h1>
      <p className={styles.titleinfo}>
        유기동물도 고유한 신원을 가질 수 있도록 블록체인 상에 안전하게 기록하고,
        <br />
        입양-후원 과정에서도 동일 개체임을 투명하게 증명하는 디지털 신원 증명
      </p>

      {/* info1 */}
      <div className={styles.info1}>
        <h3>🐾 동물등록정보에 대해 알고 계신가요?</h3>

        <div>
          <p>현재 반려견은 동물등록제를 통해 관리됩니다.</p>

          <p>
            보호자가 주민등록번호, 전화번호, 주소를 입력하면 동물등록번호가 발급되며,
            <br />
            등록 대상은 가정이나 반려 목적으로 기르는 2개월 이상 개에 한정됩니다.
          </p>

          <p>또한, 최초 등록 시에는</p>
          <ol className={styles.numberList}>
            <li>등록대상동물과 직접 동반 방문</li>
            <li>무선식별장치(칩) 부착</li>
          </ol>

          <p className={styles.highlights_red}>
            하지만 이 제도는 유기동물에게 적용되지 않습니다.
            <br />
            <br />
            등록번호가 없다는 이유로,
            <br />
            많은 유기동물은 &apos;기록되지 않은 존재&apos;로 남게 됩니다.
          </p>
        </div>
      </div>

      {/* info2 */}
      <div className={styles.info2}>
        <h3>🐶 멍냥Paw는 생각했습니다.</h3>
        <h4>&quot;모든 반려동물은, 고유한 개체로 인정받아야 한다.&quot;</h4>
        <p>
          따라서, 멍냥포는 유기동물도 고유한 신원을 가질 수 있도록
          <br />
          DID(Decentralized Identifier) 기술을 도입했습니다.
        </p>
      </div>

      {/* info3 */}
      <div className={styles.info3}>
        <h3>🔐 DID란 무엇인가요?</h3>
        <p>
          DID(분산 신원, Decentralized Identifier) 는
          <br />
          기존의 중앙기관이 관리하던 신원정보를
          <br />
          개인이 스스로 통제하고 관리할 수 있게 하는 기술입니다.
          <br />
          <br />
          중앙 서버에 의존하지 않고,
          <br />
          내 단말기(혹은 지갑)에 개인정보를 보관하며,
          <br />
          필요한 순간에만 내가 직접 증명합니다.
          <br />
          <br />
        </p>
        <div className={styles.details}>
          <p>
            즉,
            <br />
            👉 &quot;내 정보를 내가 소유하는 방식&quot;
            <br />
            👉 자기주권신원(SSI, Self-Sovereign Identity) 이라고도 부릅니다.
          </p>
        </div>
      </div>

      {/* info4 */}
      <div className={styles.info4}>
        <h3>🦴 멍냥Paw의 DID는 이렇게 작동합니다</h3>
        <p>
          1️⃣ 강아지의 코 사진(비문) 으로부터 생체 특징을 추출합니다.
          <br />
          2️⃣ 보호소 또는 소유자의 지갑 ID 와 연결하여
          <br />
          3️⃣ 단 하나뿐인 강아지 DID 를 발급합니다.
          <br />
        </p>

        <div className={styles.details}>
          이렇게 생성된 DID는 동물의 신원을 블록체인 상에 안전하게 기록하고,
          <br />
          입양·후원 과정에서도 동일 개체임을 투명하게 증명합니다.
        </div>
      </div>

      {/* info5 */}
      <div className={styles.info5}>
        <section className={styles.info5_detail}>
          <div className={styles.icon_title}>
            <div className={styles.icon}>🛡️</div>
            <h3>신원 증명</h3>
          </div>
          <p>
            DID(Decentralized Identifier)는 각 유기동물에게 고유한 디지털 신원을 부여합니다. 이를 통해 동물의
            존재와 정보가 영구적으로 기록되어 관리됩니다.
          </p>
        </section>

        <section className={styles.info5_detail}>
          <div className={styles.icon_title}>
            <div className={styles.icon}>🗄️</div>
            <h3>영구 보관</h3>
          </div>
          <p>
            블록체인 기술을 활용하여 동물의 정보가 영구적으로 보관됩니다. 입양 후에도 동물의 이력과 건강 정보를
            추적할 수 있습니다.
          </p>
        </section>

        <section className={styles.info5_detail}>
          <div className={styles.icon_title}>
            <div className={styles.icon}>👁️</div>
            <h3>투명성</h3>
          </div>
          <p>
            모든 입양 과정과 동물의 상태 변화가 투명하게 기록됩니다. 누구나 동물의 현재 상황을 확인할 수 있어
            신뢰성을 보장합니다.
          </p>
        </section>

        <section className={styles.info5_detail}>
          <div className={styles.icon_title}>
            <div className={styles.icon}>🔒</div>
            <h3>보안</h3>
          </div>
          <p>탈중앙화된 시스템으로 데이터의 위변조가 불가능하며, 개인정보는 안전하게 보호됩니다.</p>
        </section>
      </div>

      {/* info6 */}
      <div className={styles.info6}>
        <h3>DID 예시</h3>
        <div className={styles.info6_ex}>
          <p>DID:PET:2025:KR:331</p>
          <hr />
          <div className={styles.info6_category}>
            <div>
              <p className={styles.info6_highlight}>DID</p>
              <p>식별자 유형</p>
            </div>
            <div>
              <p className={styles.info6_highlight}>PET</p>
              <p>동물 구분</p>
            </div>
            <div>
              <p className={styles.info6_highlight}>2025</p>
              <p>등록 연도</p>
            </div>
            <div>
              <p className={styles.info6_highlight}>KR:331</p>
              <p>지역:고유번호</p>
            </div>
          </div>
        </div>
      </div>

      {/* info7 */}
      <div className={styles.info7}>
        <h3>어떻게 참여할 수 있나요?</h3>
        <div className={styles.info7_ex}>
          <div>
            <div className={styles.info7_logo}>🏠</div>
            <p className={styles.info7_highlight}>보호소 등록</p>
            <p>보호소에서 유기동물 발견 시 DID를 생성하여 등록합니다.</p>
          </div>
          <div>
            <div className={styles.info7_logo}>❤️</div>
            <p className={styles.info7_highlight}>입양 신청</p>
            <p>DID를 통해 동물의 정확한 정보를 확인 후 입양 신청할 수 있습니다.</p>
          </div>
          <div>
            <div className={styles.info7_logo}>📱</div>
            <p className={styles.info7_highlight}>지속적 관리</p>
            <p>입양 후에도 일지 작성을 통해 동물의 근황을 지속적으로 업데이트합니다.</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className={styles.DID_submit}>
        <Link href="/pet/register" className={styles.DID_button}>
          DID 발급하러 가기
        </Link>
      </div>
    </div>
  );
}