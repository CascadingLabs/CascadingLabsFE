/** @jsxImportSource solid-js */
import { createSignal, onMount } from 'solid-js';
import '../swamp.css';

export default function EditorialSwamp() {
	const [loading, setLoading] = createSignal(true);

	const payload = {
		title: 'The Quiet Collapse of the Attention Economy',
		author: 'Meridith Voss',
		date: 'March 8, 2026',
		body: 'For nearly two decades, the dominant model of the web was predicated on a single axiom: human attention is a finite and therefore monetisable resource. Platforms competed not on the quality of information they surfaced but on the sheer duration of the gaze they could hold. The consequences—fragmented discourse, eroded trust, a generation of products engineered to exploit cognitive bias—are now impossible to ignore. What is emerging in its wake is not a clean replacement but a slow, contested renegotiation of what it means to be useful online.',
	};

	onMount(() => {
		setTimeout(() => {
			setLoading(false);
		}, 850);
	});

	return (
		<>
			{loading() ? (
				<div class="x-wrap-outer css-k9m2p1">
					<div class="x-inner-block css-3xt7lq">
						<div class="css-skel-bar css-b1 x-skel-title" />
						<div class="css-skel-bar css-b2 x-skel-meta" />
						<div class="css-skel-bar css-b3 x-skel-body" />
						<div class="css-skel-bar css-b4 x-skel-body" />
						<div class="css-skel-bar css-b5 x-skel-body-short" />
					</div>
				</div>
			) : (
				<div class="x-wrap-outer css-k9m2p1">
					<div class="x-inner-block css-3xt7lq">
						<div class="x-content-head css-9vz4wr">
							<div class="x-ttl-wrap css-1y8xz">
								<span class="x-eyebrow css-ev3nt">Analysis</span>
								<div class="x-main-ttl css-hd2f9a">{payload.title}</div>
							</div>
							<div class="x-meta-row css-mta7b2">
								<div class="x-byline-wrap css-byl9x1">
									<span class="x-by css-pfx-by">By</span>
									<span class="x-author css-auth-nm">{payload.author}</span>
								</div>
								<div class="x-date-wrap css-dt8z3c">
									<span class="x-pub css-dt-lbl">Published</span>
									<span class="x-pub-dt css-dt-val">{payload.date}</span>
								</div>
							</div>
						</div>
						<div class="x-body-wrap css-bd9xp4">
							<div class="x-para css-p-blk">{payload.body}</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
