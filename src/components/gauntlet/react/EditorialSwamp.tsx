/** @jsxImportSource react */
import { useEffect, useState } from 'react';
import '../swamp.css';

export default function EditorialSwamp() {
	const [loading, setLoading] = useState(true);

	const payload = {
		title: 'The Quiet Collapse of the Attention Economy',
		author: 'Meridith Voss',
		date: 'March 8, 2026',
		body: 'For nearly two decades, the dominant model of the web was predicated on a single axiom: human attention is a finite and therefore monetisable resource. Platforms competed not on the quality of information they surfaced but on the sheer duration of the gaze they could hold. The consequences—fragmented discourse, eroded trust, a generation of products engineered to exploit cognitive bias—are now impossible to ignore. What is emerging in its wake is not a clean replacement but a slow, contested renegotiation of what it means to be useful online.',
	};

	useEffect(() => {
		const timer = setTimeout(() => {
			setLoading(false);
		}, 850);
		return () => clearTimeout(timer);
	}, []);

	if (loading) {
		return (
			<div className="x-wrap-outer css-k9m2p1">
				<div className="x-inner-block css-3xt7lq">
					<div className="css-skel-bar css-b1 x-skel-title" />
					<div className="css-skel-bar css-b2 x-skel-meta" />
					<div className="css-skel-bar css-b3 x-skel-body" />
					<div className="css-skel-bar css-b4 x-skel-body" />
					<div className="css-skel-bar css-b5 x-skel-body-short" />
				</div>
			</div>
		);
	}

	return (
		<div className="x-wrap-outer css-k9m2p1">
			<div className="x-inner-block css-3xt7lq">
				<div className="x-content-head css-9vz4wr">
					<div className="x-ttl-wrap css-1y8xz">
						<span className="x-eyebrow css-ev3nt">Analysis</span>
						<div className="x-main-ttl css-hd2f9a">{payload.title}</div>
					</div>
					<div className="x-meta-row css-mta7b2">
						<div className="x-byline-wrap css-byl9x1">
							<span className="x-by css-pfx-by">By</span>
							<span className="x-author css-auth-nm">{payload.author}</span>
						</div>
						<div className="x-date-wrap css-dt8z3c">
							<span className="x-pub css-dt-lbl">Published</span>
							<span className="x-pub-dt css-dt-val">{payload.date}</span>
						</div>
					</div>
				</div>
				<div className="x-body-wrap css-bd9xp4">
					<div className="x-para css-p-blk">{payload.body}</div>
				</div>
			</div>
		</div>
	);
}
